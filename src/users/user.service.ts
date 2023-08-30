import { writeFileSync } from "fs";
import { IBotContext } from "../context/context.interface";
import { Roles } from "./enums/roles.enum";
import { IUser } from "./models/user.interface";
import { IUserService } from "./user-service.interface";
import users from "../data/users.json";
import path from "path";
import { User } from "telegraf/typings/core/types/typegram";

export class UserService implements IUserService {
  usersList: IUser[];

  constructor() {
    this.usersList = users as IUser[];
  }

  attachUser(ctx: IBotContext): void {
    if (!ctx.message) {
      throw new Error("Message not found");
    }
    const { id } = ctx.message.from;
    const user = this.usersList.find((usr) => usr.id === id);

    if (user) {
      ctx.session.user = user;
    } else {
      const newUser = this.createUser(ctx.message.from);
      ctx.session.user = newUser;
    }
  }

  createUser(userData: User): IUser {
    const newUser = {
      ...userData,
      creationTs: Date.now(),
      requests: [],
      roles: [Roles.USER],
    };

    this.usersList.push(newUser);
    writeFileSync(
      path.resolve("src/data/users.json"),
      JSON.stringify(this.usersList),
    );
    console.log("===user created===");
    return newUser;
  }
  addReqest(ctx: IBotContext): void {
    if (!ctx.message) {
      throw new Error("Message not found");
    }
    const { id } = ctx.message.from;
    const user = this.usersList.find((usr) => usr.id === id);
    user?.requests.push({
      ts: Date.now(),
    });
    writeFileSync(
      path.resolve("src/data/users.json"),
      JSON.stringify(this.usersList),
    );
  }
}
