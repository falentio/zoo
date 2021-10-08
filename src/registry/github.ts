import "urlpattern";
import { Registry } from "/registry/types.ts";
import ky from "ky";

const pattern = (url: string) => new URLPattern("https://github.com/:username/:repo/:ref/:file*");
