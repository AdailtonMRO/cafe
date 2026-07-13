import test from 'node:test';
import assert from 'node:assert/strict';
import { coffeeNews, getCoffeeNewsStory } from '../coffee-news.js';

test('returns the featured coffee news story for the requested index', () => {
  const story = getCoffeeNewsStory(0);
  assert.equal(story.title, coffeeNews[0].title);
});

test('falls back to the first story when the index is out of bounds', () => {
  const story = getCoffeeNewsStory(99);
  assert.equal(story.title, coffeeNews[0].title);
});
