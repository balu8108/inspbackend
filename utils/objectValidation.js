const isObjectValid = (obj) => {
  return obj && Object.keys(obj).length > 0;
};

module.exports = isObjectValid;
