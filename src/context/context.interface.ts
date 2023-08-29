import { Context } from "telegraf";
import { IUser } from "../users/models/user.interface";

export interface SessionData {
  user: IUser;
}

export interface IBotContext extends Context {
  session: SessionData;
}
