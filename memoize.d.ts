// workaround for https://github.com/sindresorhus/memoize/issues/95
declare module "memoize" {
  import * as m from "memoize/dist/index";
  export default m.default;
}
