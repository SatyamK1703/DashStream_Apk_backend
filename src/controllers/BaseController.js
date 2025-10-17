import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';

/**
 * BaseController - Abstract base controller with common CRUD operations
 * This reduces code duplication across controllers by providing reusable methods
 */
class BaseController {
  /**
   * @param {Object} model - Mongoose model
   * @param {string} modelName - Name of the model (for error messages)
   */
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName || model.modelName;
  }

  /**
   * Get all documents
   * @param {Object} filterOptions - Filter options for query
   * @param {Object} populateOptions - Population options
   * @returns {Function} Express middleware
   */
  getAll(filterOptions = {}, populateOptions = null) {
    return asyncHandler(async (req, res, next) => {
      let query = this.model.find(filterOptions);
      
      // Apply population if specified
      if (populateOptions) {
        query = query.populate(populateOptions);
      }
      
      const docs = await query;
      
      res.status(200).json({
        status: 'success',
        results: docs.length,
        data: { [this.modelName.toLowerCase() + 's']: docs }
      });
    });
  }

  /**
   * Get document by ID
   * @param {Object} populateOptions - Population options
   * @returns {Function} Express middleware
   */
  getOne(populateOptions = null) {
    return asyncHandler(async (req, res, next) => {
      let query = this.model.findById(req.params.id);
      
      // Apply population if specified
      if (populateOptions) {
        query = query.populate(populateOptions);
      }
      
      const doc = await query;
      
      if (!doc) {
        return next(new AppError(`No ${this.modelName} found with that ID`, 404));
      }
      
      res.status(200).json({
        status: 'success',
        data: { [this.modelName.toLowerCase()]: doc }
      });
    });
  }

  /**
   * Create new document
   * @returns {Function} Express middleware
   */
  createOne() {
    return asyncHandler(async (req, res, next) => {
      const doc = await this.model.create(req.body);
      
      res.status(201).json({
        status: 'success',
        data: { [this.modelName.toLowerCase()]: doc }
      });
    });
  }

  /**
   * Update document by ID
   * @returns {Function} Express middleware
   */
  updateOne() {
    return asyncHandler(async (req, res, next) => {
      const doc = await this.model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
      
      if (!doc) {
        return next(new AppError(`No ${this.modelName} found with that ID`, 404));
      }
      
      res.status(200).json({
        status: 'success',
        data: { [this.modelName.toLowerCase()]: doc }
      });
    });
  }

  /**
   * Delete document by ID
   * @returns {Function} Express middleware
   */
  deleteOne() {
    return asyncHandler(async (req, res, next) => {
      const doc = await this.model.findByIdAndDelete(req.params.id);
      
      if (!doc) {
        return next(new AppError(`No ${this.modelName} found with that ID`, 404));
      }
      
      res.status(204).json({
        status: 'success',
        data: null
      });
    });
  }

  /**
   * Get documents with pagination, sorting, and filtering
   * @returns {Function} Express middleware
   */
  getAllWithFeatures() {
    return asyncHandler(async (req, res, next) => {
      // BUILD QUERY
      // 1) Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);
      
      // 2) Advanced filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let query = this.model.find(JSON.parse(queryStr));
      
      // 3) Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }
      
      // 4) Field limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v');
      }
      
      // 5) Pagination
      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 100;
      const skip = (page - 1) * limit;
      
      query = query.skip(skip).limit(limit);
      
      // EXECUTE QUERY
      const docs = await query;
      
      // SEND RESPONSE
      res.status(200).json({
        status: 'success',
        results: docs.length,
        data: { [this.modelName.toLowerCase() + 's']: docs }
      });
    });
  }
}

export default BaseController;