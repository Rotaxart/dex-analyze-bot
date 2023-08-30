import { IConfigService } from "./config/config.interface";
import { Telegraf } from "telegraf";
import { IBotContext } from "./context/context.interface";
import { Command } from "./commands/command.class";
import { StartCommand } from "./commands/start.command";
import LocalSession from "telegraf-session-local";
import { ConfigService } from "./config/config.service";
import { HelpCommand } from "./commands/help.command";
import { IUserService } from "./users/user-service.interface";
import { UserService } from "./users/user.service";
import { AnalyzeCommand } from "./commands/analyze.command";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];

  constructor(
    private readonly configService: IConfigService,
    private userService: IUserService,
  ) {
    this.bot = new Telegraf<IBotContext>(
      this.configService.get("TELEGRAM_BOT_TOKEN"),
    );
    this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());
  }

  init() {
    this.commands = [
      new StartCommand(this.bot, this.userService),
      new HelpCommand(this.bot),
      new AnalyzeCommand(this.bot, this.userService),
    ];

    for (const command of this.commands) {
      command.handle();
    }

    this.bot.launch();
    console.log("===Bot started===");
  }
}

const bot = new Bot(new ConfigService(), new UserService());

bot.init();
