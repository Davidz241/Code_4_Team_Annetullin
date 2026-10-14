// game.ts
// The rules of the game: each round there is a word, and everyone –
// the AI too – writes the craziest sentence they can think of with it.

import { askMistral } from "./mistral.ts";

const ROUNDS = 5;
const WORDS = ["cactus", "penguin", "toaster", "unicorn", "volcano", "garden gnome", "octopus", "homework", "wizard"];
const additionalWords = ["spaceship", "banana", "robot", "mermaid", "taco", "dragon", "pancake", "zombie", "rainbow"];

// Separate lists for adjectives and verbs so we can require/use them explicitly per round
const ADJECTIVES = ["glorious", "fluffy", "silly", "bouncy"];
const VERBS = ["dances", "jumps", "sings", "flies", "sprint"];

interface State { players: { id: string; name: string }[]; round: number; word: string; adjective: string; verb: string }

export const game = {
  players: 2, // the game starts as soon as this many players have joined

  setup(players: State["players"]): State {
    return { players, round: 0, word: "", adjective: "", verb: "" };
  },

  // A new round begins: returns the text all players see
  startRound(state: State): string {
    state.round++;
    const nounPool: string[] = [...WORDS, ...additionalWords];
    const adjPool: string[] = ADJECTIVES;
    const verbPool: string[] = VERBS;

    state.word = nounPool[Math.floor(Math.random() * nounPool.length)];
    state.adjective = adjPool[Math.floor(Math.random() * adjPool.length)];
    state.verb = verbPool[Math.floor(Math.random() * verbPool.length)];

    return `Round ${state.round}/${ROUNDS}: Write ONE crazy, funny sentence (max. 25 words) containing the noun "${state.word}" and using the adjective "${state.adjective}" and the verb "${state.verb}".`;
  },

  // What does the AI write?
  async botInput(state: State): Promise<string> {
    const prompt = `Write ONE crazy, funny sentence (max. 25 words) containing the noun "${state.word}" and using the adjective "${state.adjective}" and the verb "${state.verb}". ` +
      "Reply with only the sentence.";
    return await askMistral(prompt) ?? "The AI is speechless.";
  },

  // Everyone has submitted (inputs: player ID → text, the AI is "bot")
  endRound(state: State, inputs: Record<string, string>) {
    const entries = state.players.map((p) => ({ name: p.name, text: inputs[p.id] }));
    entries.push({ name: "🤖 AI", text: inputs.bot });
    return { title: `The words were: ${state.word} (noun), ${state.adjective} (adjective), ${state.verb} (verb)`, entries, gameOver: state.round >= ROUNDS };
  },
};