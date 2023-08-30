import { User } from "telegraf/typings/core/types/typegram";
import { Roles } from "../enums/roles.enum";
import { AnalyzeReq } from "../../analyze/models/analyze-request.interface";

export interface IUser extends User {
  creationTs: number;
  requests: AnalyzeReq[];
  roles: Roles[];
}
