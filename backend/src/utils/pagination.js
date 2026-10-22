/** Standard paginated list response. */
export const pageResult = (items, total, { page, limit }) => ({ items, total, page, pages: Math.ceil(total / limit) || 1 });

/** Applies a serializer to the items of a paginated result. */
export const mapItems = (result, serialize) => ({ ...result, items: result.items.map(serialize) });
