import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import httpStatus from 'http-status';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider, Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { config } from '../../config';
import { AppError } from '../../errors/AppError';
import { signToken, verifyToken } from '../../utils/jwt';

const googleClient = new OAuth2Client(config.google.clientId);

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateAuthTokens = async (user: { id: string; role: Role; email: string }) => {
  const accessToken = signToken(
    { userId: user.id, role: user.role, email: user.email },
    config.jwt.accessSecret,
    config.jwt.accessExpiresIn,
  );
  const refreshToken = signToken(
    { userId: user.id, role: user.role, email: user.email },
    config.jwt.refreshSecret,
    config.jwt.refreshExpiresIn,
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'COMPANY' | 'CANDIDATE';
  companyName?: string;
  phone?: string;
}

const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(input.password, config.bcrypt.saltRounds);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role as Role,
        provider: AuthProvider.LOCAL,
      },
    });

    if (input.role === 'COMPANY') {
      const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
      await tx.companyProfile.create({
        data: {
          userId: createdUser.id,
          companyName: input.companyName as string,
          planId: freePlan?.id,
          subscriptionStatus: 'ACTIVE',
          subscriptionStartAt: new Date(),
        },
      });
    } else {
      await tx.candidateProfile.create({
        data: {
          userId: createdUser.id,
          phone: input.phone,
        },
      });
    }

    return createdUser;
  });

  const tokens = await generateAuthTokens(user);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  if (user.provider !== AuthProvider.LOCAL || !user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This account uses Google sign-in. Please continue with Google.',
    );
  }

  if (!user.isActive) {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been deactivated');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await generateAuthTokens(user);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

const googleLogin = async (idToken: string, roleForNewUser?: 'COMPANY' | 'CANDIDATE') => {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Google account has no verified email');
  }

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
  });

  if (!user) {
    const role = roleForNewUser || 'CANDIDATE';
    user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: payload.name || payload.email!.split('@')[0],
          email: payload.email!,
          googleId: payload.sub,
          provider: AuthProvider.GOOGLE,
          role: role as Role,
        },
      });

      if (role === 'COMPANY') {
        const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
        await tx.companyProfile.create({
          data: {
            userId: createdUser.id,
            companyName: `${createdUser.name}'s Company`,
            planId: freePlan?.id,
            subscriptionStatus: 'ACTIVE',
            subscriptionStartAt: new Date(),
          },
        });
      } else {
        await tx.candidateProfile.create({ data: { userId: createdUser.id } });
      }

      return createdUser;
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: payload.sub, provider: AuthProvider.GOOGLE },
    });
  }

  if (!user.isActive) {
    throw new AppError(httpStatus.FORBIDDEN, 'This account has been deactivated');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await generateAuthTokens(user);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
};

const refreshAuthToken = async (refreshToken: string) => {
  let decoded;
  try {
    decoded = verifyToken(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findFirst({
    where: { userId: decoded.userId, tokenHash, revokedAt: null },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Refresh token is invalid or has been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.deletedAt || !user.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User no longer has access');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await generateAuthTokens(user);
  return tokens;
};

const logout = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const changePassword = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password change is not available for this account');
  }

  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Old password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
};

export const AuthService = {
  register,
  login,
  googleLogin,
  refreshAuthToken,
  logout,
  changePassword,
};
