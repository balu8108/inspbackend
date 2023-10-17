const splitStringWithSlash = (str) => {
  if (str.length === 0) {
    throw new Error("No string provided");
  }
  const slashSplitArray = str.split("/");
  return slashSplitArray;
};

const formM3U8String = (arrOfStrings) => {
  if (arrOfStrings.length === 0) {
    throw new Error("Array length is not sufficient");
  }
  const extractLastFileName = arrOfStrings[arrOfStrings.length - 1];
  const splitFromDot = extractLastFileName.split(".");
  const joinComplete = splitFromDot.slice(0, -1).join(".");

  return joinComplete + ".m3u8";
};

module.exports = { splitStringWithSlash, formM3U8String };
