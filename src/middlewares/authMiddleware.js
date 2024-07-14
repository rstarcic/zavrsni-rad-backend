import jwt from "jsonwebtoken";
const authenticateToken = (req, res, next) => {
    const authHeader =  req.headers['authorization'] || req.headers['Authorization'];
    console.log('Auth Header:', authHeader); 
  const token = authHeader && authHeader.split(' ')[1];
  console.log('Extracted Token:', token); 
  if (!token) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
  
    jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      console.log('Decoded Token Contents:', user);
      req.user = user;
      next();
    });
};
  
export { authenticateToken }