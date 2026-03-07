import type { InterviewQuestion } from '../types/interview'

export const MOCK_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    statement:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Map'],
    estimatedMinutes: 20,
    hint: 'Use a hash map to store previously seen values and their indices.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      'Only one valid answer exists.',
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'nums[0] + nums[1] == 9',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
    ],
    starterCode: {
      typescript: `export function twoSum(nums: number[], target: number): number[] {\n  // Write your solution here\n  return []\n}`,
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n  return [];\n}`,
      python: `def two_sum(nums, target):\n    # Write your solution here\n    return []`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}`,
    },
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    statement: 'Given a string containing just the characters `()[]{}`, determine if the input string is valid.',
    difficulty: 'Easy',
    tags: ['String', 'Stack'],
    estimatedMinutes: 15,
    hint: 'Traverse once and push opening brackets. Match and pop when you find closing brackets.',
    constraints: ['1 <= s.length <= 10^4', 's consists only of parentheses characters.'],
    examples: [
      {
        input: 's = "()[]{}"',
        output: 'true',
      },
      {
        input: 's = "(]"',
        output: 'false',
      },
    ],
    starterCode: {
      typescript: `export function isValid(s: string): boolean {\n  // Write your solution here\n  return false\n}`,
      javascript: `function isValid(s) {\n  // Write your solution here\n  return false;\n}`,
      python: `def is_valid(s: str) -> bool:\n    # Write your solution here\n    return False`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        return false;\n    }\n}`,
    },
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    statement:
      'Given an array of strings, group the anagrams together. Return the answer in any order.',
    difficulty: 'Medium',
    tags: ['Array', 'String', 'Hash Map', 'Sorting'],
    estimatedMinutes: 30,
    hint: 'Use sorted-string or frequency count as a canonical key in a hash map.',
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters.',
    ],
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      },
      {
        input: 'strs = [""]',
        output: '[[""]]',
      },
    ],
    starterCode: {
      typescript: `export function groupAnagrams(strs: string[]): string[][] {\n  // Write your solution here\n  return []\n}`,
      javascript: `function groupAnagrams(strs) {\n  // Write your solution here\n  return [];\n}`,
      python: `def group_anagrams(strs):\n    # Write your solution here\n    return []`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        // Write your solution here\n        return new ArrayList<>();\n    }\n}`,
    },
  },
  {
    id: 'longest-substring-without-repeat',
    title: 'Longest Substring Without Repeating Characters',
    statement:
      'Given a string `s`, find the length of the longest substring without repeating characters.',
    difficulty: 'Medium',
    tags: ['String', 'Sliding Window', 'Hash Map'],
    estimatedMinutes: 25,
    hint: 'Use a sliding window with a map of last seen index for each character.',
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, and symbols.'],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
      },
    ],
    starterCode: {
      typescript: `export function lengthOfLongestSubstring(s: string): number {\n  // Write your solution here\n  return 0\n}`,
      javascript: `function lengthOfLongestSubstring(s) {\n  // Write your solution here\n  return 0;\n}`,
      python: `def length_of_longest_substring(s: str) -> int:\n    # Write your solution here\n    return 0`,
      java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        return 0;\n    }\n}`,
    },
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    statement:
      'Design a data structure that follows the Least Recently Used (LRU) cache policy with O(1) get and put operations.',
    difficulty: 'Hard',
    tags: ['Hash Map', 'Linked List', 'Design'],
    estimatedMinutes: 45,
    hint: 'Combine a hash map (key -> node) with a doubly linked list to track recency.',
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put.',
    ],
    examples: [
      {
        input:
          'LRUCache cache = new LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2)',
        output: '[null,null,null,1,null,-1]',
      },
    ],
    starterCode: {
      typescript: `class LRUCache {\n  constructor(capacity: number) {}\n\n  get(key: number): number {\n    return -1\n  }\n\n  put(key: number, value: number): void {}\n}\n\nexport default LRUCache`,
      javascript: `class LRUCache {\n  constructor(capacity) {}\n\n  get(key) {\n    return -1;\n  }\n\n  put(key, value) {}\n}`,
      python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass`,
      java: `class LRUCache {\n    public LRUCache(int capacity) {}\n\n    public int get(int key) {\n        return -1;\n    }\n\n    public void put(int key, int value) {}\n}`,
    },
  },
]
