/* eslint-disable prettier/prettier */
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from '../interfaces/authenticated-request';


@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const user = req.user;

    if (!user || !user.profile) {
      throw new ForbiddenException('No authenticated user in request');
    }

    if (user.profile.is_admin !== 1) {
      throw new ForbiddenException('Admin privileges required');
    }

    return true;
  }
}
