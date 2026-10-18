// validate({ body, query, params }) – mỗi phần là Zod schema, dữ liệu sau parse được gán ngược vào req
export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (err) {
    next(err); // ZodError → errorHandler chuyển thành 400
  }
};
