const splitStringWithSlash = (str) => {
  if (str.length === 0) {
    throw new Error("No string provided");
  }
  const slashSplitArray = str.split("/");
  return slashSplitArray;
};

const formMPDString = (arrOfStrings) => {
  if (arrOfStrings.length === 0) {
    throw new Error("Array length is not sufficient");
  }
  const extractLastFileName = arrOfStrings[arrOfStrings.length - 1];
  const splitFromDot = extractLastFileName.split(".");
  const joinComplete = splitFromDot.slice(0, -1).join(".");

  return joinComplete + "/" + joinComplete + ".mp4";
};
module.exports = { splitStringWithSlash, formMPDString };
