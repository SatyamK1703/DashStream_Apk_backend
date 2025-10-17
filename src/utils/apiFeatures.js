/**
 * API Features class for handling query features like filtering, sorting, field limiting, and pagination
 */
class APIFeatures {
  /**
   * @param {Object} query - Mongoose query object
   * @param {Object} queryString - Query string from Express request
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter the query based on query parameters
   * @returns {APIFeatures} - Returns this for method chaining
   */
  filter() {
    // Create a copy of the query object
    const queryObj = { ...this.queryString };
    
    // Fields to exclude from filtering
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Advanced filtering for operators like gte, gt, lte, lt
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  /**
   * Sort the query results
   * @returns {APIFeatures} - Returns this for method chaining
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default sort by creation date, descending
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  /**
   * Limit the fields returned in the query results
   * @returns {APIFeatures} - Returns this for method chaining
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // By default, exclude the '__v' field
      this.query = this.query.select('-__v');
    }

    return this;
  }

  /**
   * Paginate the query results
   * @returns {APIFeatures} - Returns this for method chaining
   */
  paginate() {
    const page = this.queryString.page * 1 || 1; // Convert to number, default: 1
    const limit = this.queryString.limit * 1 || 10; // Convert to number, default: 10
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

export default APIFeatures;