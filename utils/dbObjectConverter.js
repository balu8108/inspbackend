// This function converts a db instance of sequelize into a plain object
const dbObjectConverter = (dbObject) => {
  return JSON.parse(JSON.stringify(dbObject, null, 2));
};
module.exports = dbObjectConverter;
