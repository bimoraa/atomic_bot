// - Lorem ipsum dolor sit amet, consectetur adipiscing elit. - \\

/**
 * Returns unique elements from an array
 * @param {T[]} arr - Array to process
 * @returns {T[]} Array with duplicates removed
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Flattens a nested array by one level
 * @param {T[][]} arr - Nested array
 * @returns {T[]} Flattened array
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.flat()
}

/**
 * Recursively flattens a deeply nested array
 * @param {any[]} arr - Deeply nested array
 * @returns {T[]} Completely flattened array
 */
export function deep_flatten<T>(arr: any[]): T[] {
  return arr.flat(Infinity) as T[]
}

/**
 * Splits an array into chunks of specified size
 * @param {T[]} arr - Array to chunk
 * @param {number} size - Size of each chunk
 * @returns {T[][]} Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

// - Grouping and Counting - \\
// - Functions for organizing and aggregating data - \\

/**
 * Groups array elements by a key function
 * @param {T[]} arr - Array to group
 * @param {(item: T) => K} key - Function to extract grouping key
 * @returns {Record<K, T[]>} Object with grouped arrays
 */
export function group_by<T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] = acc[k] || []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}

/**
 * Counts occurrences of items grouped by a key function
 * @param {T[]} arr - Array to count
 * @param {(item: T) => K} key - Function to extract counting key
 * @returns {Record<K, number>} Object with counts
 */
export function count_by<T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<K, number>)
}

/**
 * Sorts an array by a key function
 * @param {T[]} arr - Array to sort
 * @param {(item: T) => number | string} key - Function to extract sort key
 * @param {boolean} desc - Sort in descending order
 * @returns {T[]} Sorted array
 */
export function sort_by<T>(arr: T[], key: (item: T) => number | string, desc: boolean = false): T[] {
  return [...arr].sort((a, b) => {
    const va = key(a)
    const vb = key(b)
    if (va < vb) return desc ? 1 : -1
    if (va > vb) return desc ? -1 : 1
    return 0
  })
}

/**
 * Finds an element by key-value pair
 * @param {T[]} arr - Array to search
 * @param {K} key - Property key to match
 * @param {T[K]} value - Value to match
 * @returns {T | undefined} Found element or undefined
 */
export function find_by<T, K extends keyof T>(arr: T[], key: K, value: T[K]): T | undefined {
  return arr.find((item) => item[key] === value)
}

/**
 * Filters elements by key-value pair
 * @param {T[]} arr - Array to filter
 * @param {K} key - Property key to match
 * @param {T[K]} value - Value to match
 * @returns {T[]} Filtered array
 */
export function filter_by<T, K extends keyof T>(arr: T[], key: K, value: T[K]): T[] {
  return arr.filter((item) => item[key] === value)
}

// - Array Modification - \\
// - Functions for adding, removing, and manipulating array elements - \\

/**
 * Removes an item from an array
 * @param {T[]} arr - Source array
 * @param {T} item - Item to remove
 * @returns {T[]} New array without the item
 */
export function remove<T>(arr: T[], item: T): T[] {
  return arr.filter((i) => i !== item)
}

/**
 * Removes an item at a specific index
 * @param {T[]} arr - Source array
 * @param {number} index - Index to remove
 * @returns {T[]} New array without the element at index
 */
export function remove_at<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1)]
}

/**
 * Inserts an item at a specific index
 * @param {T[]} arr - Source array
 * @param {number} index - Index to insert at
 * @param {T} item - Item to insert
 * @returns {T[]} New array with item inserted
 */
export function insert_at<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index)]
}

/**
 * Replaces an item at a specific index
 * @param {T[]} arr - Source array
 * @param {number} index - Index to replace
 * @param {T} item - New item
 * @returns {T[]} New array with item replaced
 */
export function replace_at<T>(arr: T[], index: number, item: T): T[] {
  return [...arr.slice(0, index), item, ...arr.slice(index + 1)]
}

/**
 * Swaps two elements in an array
 * @param {T[]} arr - Source array
 * @param {number} i - First index
 * @param {number} j - Second index
 * @returns {T[]} New array with elements swapped
 */
export function swap<T>(arr: T[], i: number, j: number): T[] {
  const result = [...arr]
  ;[result[i], result[j]] = [result[j], result[i]]
  return result
}

/**
 * Moves an element from one index to another
 * @param {T[]} arr - Source array
 * @param {number} from - Source index
 * @param {number} to - Destination index
 * @returns {T[]} New array with element moved
 */
export function move<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

/**
 * Returns the first element of an array
 * @param {T[]} arr - Source array
 * @returns {T | undefined} First element or undefined
 */
export function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

/**
 * Returns the last element of an array
 * @param {T[]} arr - Source array
 * @returns {T | undefined} Last element or undefined
 */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1]
}

/**
 * Takes the first n elements from an array
 * @param {T[]} arr - Source array
 * @param {number} n - Number of elements to take
 * @returns {T[]} First n elements
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n)
}

/**
 * Takes the last n elements from an array
 * @param {T[]} arr - Source array
 * @param {number} n - Number of elements to take
 * @returns {T[]} Last n elements
 */
export function take_last<T>(arr: T[], n: number): T[] {
  return arr.slice(-n)
}

/**
 * Drops the first n elements from an array
 * @param {T[]} arr - Source array
 * @param {number} n - Number of elements to drop
 * @returns {T[]} Array without first n elements
 */
export function drop<T>(arr: T[], n: number): T[] {
  return arr.slice(n)
}

/**
 * Drops the last n elements from an array
 * @param {T[]} arr - Source array
 * @param {number} n - Number of elements to drop
 * @returns {T[]} Array without last n elements
 */
export function drop_last<T>(arr: T[], n: number): T[] {
  return arr.slice(0, -n)
}

/**
 * Creates a range of numbers
 * @param {number} start - Start value
 * @param {number} end - End value (exclusive)
 * @param {number} step - Step increment
 * @returns {number[]} Array of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

/**
 * Combines two arrays into an array of tuples
 * @param {T[]} a - First array
 * @param {U[]} b - Second array
 * @returns {[T, U][]} Array of tuples
 */
export function zip<T, U>(a: T[], b: U[]): [T, U][] {
  const len = Math.min(a.length, b.length)
  const result: [T, U][] = []
  for (let i = 0; i < len; i++) {
    result.push([a[i], b[i]])
  }
  return result
}

/**
 * Separates an array of tuples into two arrays
 * @param {[T, U][]} arr - Array of tuples
 * @returns {[T[], U[]]} Tuple of two arrays
 */
export function unzip<T, U>(arr: [T, U][]): [T[], U[]] {
  const a: T[] = []
  const b: U[] = []
  for (const [t, u] of arr) {
    a.push(t)
    b.push(u)
  }
  return [a, b]
}

// - Set Operations - \\
// - Mathematical set operations on arrays - \\

/**
 * Returns the intersection of two arrays
 * @param {T[]} a - First array
 * @param {T[]} b - Second array
 * @returns {T[]} Elements common to both arrays
 */
export function intersection<T>(a: T[], b: T[]): T[] {
  const set = new Set(b)
  return a.filter((item) => set.has(item))
}

/**
 * Returns the difference between two arrays
 * @param {T[]} a - First array
 * @param {T[]} b - Second array
 * @returns {T[]} Elements in a but not in b
 */
export function difference<T>(a: T[], b: T[]): T[] {
  const set = new Set(b)
  return a.filter((item) => !set.has(item))
}

/**
 * Returns the union of two arrays
 * @param {T[]} a - First array
 * @param {T[]} b - Second array
 * @returns {T[]} All unique elements from both arrays
 */
export function union<T>(a: T[], b: T[]): T[] {
  return unique([...a, ...b])
}

/**
 * Checks if two arrays are equal
 * @param {T[]} a - First array
 * @param {T[]} b - Second array
 * @returns {boolean} True if arrays are equal
 */
export function is_equal<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

/**
 * Checks if one array is a subset of another
 * @param {T[]} subset - Potential subset array
 * @param {T[]} superset - Potential superset array
 * @returns {boolean} True if subset is contained in superset
 */
export function is_subset<T>(subset: T[], superset: T[]): boolean {
  const set = new Set(superset)
  return subset.every((item) => set.has(item))
}

/**
 * @param {number[]} arr - Source array
 * @returns {number} Sum of elements
 */
export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

/**
 * @param {number[]} arr - Source array
 * @returns {number} Average value or 0 when empty
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return sum(arr) / arr.length
}

/**
 * @param {number[]} arr - Source array
 * @returns {number} Minimum value
 */
export function min(arr: number[]): number {
  return Math.min(...arr)
}

/**
 * @param {number[]} arr - Source array
 * @returns {number} Maximum value
 */
export function max(arr: number[]): number {
  return Math.max(...arr)
}

/**
 * @param {number[]} arr - Source array
 * @returns {number} Median value or 0 when empty
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
