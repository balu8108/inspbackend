const checkArraysHaveSameElements = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false;
  }

  const frequencyCount = {};

  // Count frequencies of elements in arr1
  for (const element of arr1) {
    frequencyCount[element] = (frequencyCount[element] || 0) + 1;
  }

  // Decrement frequencies based on elements in arr2
  for (const element of arr2) {
    if (!frequencyCount[element]) {
      return false;
    }
    frequencyCount[element]--;
  }

  // Check if all frequencies are zero
  for (const element in frequencyCount) {
    if (frequencyCount[element] !== 0) {
      return false;
    }
  }

  return true;
};

module.exports = checkArraysHaveSameElements;
