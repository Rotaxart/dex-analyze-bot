import { Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";

export class HelpCommand extends Command {
  constructor(bot: Telegraf<IBotContext>) {
    super(bot);
  }

  handle(): void {
    try {
      this.bot.help((ctx) => {
        ctx.reply(`
/start - start bot
/analyze <wallet address> eth - get wallet exchange history
`);
      });
    } catch (error: any) {
      console.error(error);
    }
  }
}
