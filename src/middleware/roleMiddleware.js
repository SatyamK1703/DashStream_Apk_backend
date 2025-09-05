/**
 * Role-based access control middleware
 * Checks if the authenticated user has the required role(s) to access a route
 */

export const checkRole = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User has no role assigned'
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user.role}' not authorized`
      });
    }

    // User has required role, proceed
    next();
  };
};