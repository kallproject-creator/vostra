import { StoryChapter, StoryEpisode } from '../types/game';
import { CHAPTERS_PART_1 } from './storyPart1';
import { CHAPTERS_PART_2 } from './storyPart2';

export const STORY_CHAPTERS: StoryChapter[] = [...CHAPTERS_PART_1, ...CHAPTERS_PART_2];

export const ALL_EPISODES: StoryEpisode[] = STORY_CHAPTERS.flatMap((ch) => ch.episodes);

export function getEpisodeByNumbers(chapter: number, episode: number): StoryEpisode | undefined {
  return ALL_EPISODES.find(
    (e) => e.chapterNumber === chapter && e.episodeNumber === episode
  );
}

export function getNextEpisodePosition(
  chapter: number,
  episode: number
): { chapter: number; episode: number } | null {
  if (episode < 12) {
    return { chapter, episode: episode + 1 };
  }
  if (chapter < 10) {
    return { chapter: chapter + 1, episode: 1 };
  }
  return null;
}
