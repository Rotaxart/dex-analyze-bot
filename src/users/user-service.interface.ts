import { User } from "telegraf/typings/core/types/typegram";
import { IBotContext } from "../context/context.interface";
import { Roles } from "./enums/roles.enum";
import { IUser } from "./models/user.interface";

export interface IUserService {
  attachUser(ctx: IBotContext): void;
  createUser(userData: User): IUser;
  getUser(userId: number): IUser;
  grantRole(userId: number, role: Roles): IUser;
}
