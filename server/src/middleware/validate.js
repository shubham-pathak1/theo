import { ApiError } from "../utils/ApiError.js";

export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      next(new ApiError(400, "Invalid request", parsed.error.flatten()));
      return;
    }

    req.validated = parsed.data;
    next();
  };
}
