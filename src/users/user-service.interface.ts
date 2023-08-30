import { User } from "telegraf/typings/core/types/typegram";
import { IBotContext } from "../context/context.interface";
import { IUser } from "./models/user.interface";

export interface IUserService {
  attachUser(ctx: IBotContext): void;
  createUser(userData: User): IUser;
  addReqest(ctx: IBotContext): void;
}
