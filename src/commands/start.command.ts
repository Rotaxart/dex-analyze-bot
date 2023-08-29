import { Markup, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { IUserService } from "../users/user-service.interface";
import { Roles } from "../users/enums/roles.enum";
import { HelpCommand } from "./help.command";

export class StartCommand extends Command {
  constructor(
    bot: Telegraf<IBotContext>,
    private userService: IUserService,
  ) {
    super(bot);
  }

  handle(): void {
    try {
      this.bot.start(async (ctx) => {
        this.userService.attachUser(ctx);
        ctx.reply(
          `Hello, ${ctx.message.from.first_name
          }! This is dex analyzer bot. Send /help to get commands. 
Account type: ${ctx.session.user.roles?.includes(Roles.ANALYZER)
            ? Roles.ANALYZER
            : Roles.USER
          }`,
        );
      });
    } catch (error) {
      console.error(error);
    }
  }
}
