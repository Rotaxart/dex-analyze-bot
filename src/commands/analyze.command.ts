import { Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { IUserService } from "../users/user-service.interface";
import { IAnalyze } from "../analyze/analyze.interface";
import { AnalyzeService } from "../analyze/analyze.service";
import { Roles } from "../users/enums/roles.enum";
import { AnalyzeReq } from "../analyze/models/analyze-request.interface";
import { isAddress } from "ethers";

export class AnalyzeCommand extends Command {
  analyzeService: IAnalyze;
  constructor(
    bot: Telegraf<IBotContext>,
    private userService: IUserService,
  ) {
    super(bot);
    this.analyzeService = new AnalyzeService();
  }

  handle(): void {
    this.bot.command("analyze", async (ctx) => {
      console.log(ctx.message);
      try {
        this.userService.attachUser(ctx);
        const validate = this.validate(ctx);
        if (!validate.success) {
          ctx.reply(validate.message);
        } else {
          ctx.reply(`Please wait...`);
          await this.analyzeService.analyzeAddress(ctx);
          console.log(ctx.update.message);
        }
      } catch (error: any) {
        console.error(error);
      }
    });
  }

  validate(ctx: IBotContext | any) {
    const user = ctx.session.user;
    if (!user) {
      throw new Error("User not found");
    }
    const reqs = user.requests.filter(
      (req: AnalyzeReq) => req.ts > Date.now() - 1000 * 60 * 60 * 24,
    );

    const params = ctx.message?.text.split(" ");
    console.log(params);
    if (params.length === 3) {
      if (!isAddress(params[1])) {
        return { success: false, message: "Invalid address" };
      }
      if (params[2] !== "eth") {
        return { success: false, message: "Invalid network" };
      }
    } else {
      return { success: false, message: "Need address and network" };
    }

    if (
      (user.roles.includes(Roles.ANALYZER) && reqs.length < 20) ||
      reqs.length < 5
    ) {
      return { success: true, message: "" };
    } else {
      return { success: false, message: "Daily limit exceeded :(" };
    }
  }
}
