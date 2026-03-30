# Concept 

A **social guessing game** built around short, anonymous conversations inside trusted friend circles.

Users **create a profile**, **add friends**, and **form friend circles**.
Friends are visible with an **online / offline** status.

## 👥 Creating a Game Circle

A user can start a game by clicking “Create Circle”.

**They can:**
- Add up to 5 friends who are currently online
- Or generate a temporary invite link to share via WhatsApp, Instagram, etc.
**Invite links:**
- Are temporary
- Expire automatically
- Only allow entry into the current game session
Once created, all participants become part of a temporary game circle.
## ⏱️ Gameplay Flow
- The system randomly selects one player as the starter
- The system randomly selects another player from the same circle
- A 60-second chat session begins
**During the chat:**
- The non-starter knows exactly who the starter is
- The starter does NOT know who they are talking to
- All other members of the circle become spectators and they can see the chat in real time but cannot send messages or interact with the chat
- The starter is the only person guessing.
## 🔁 Rounds & Rotation
- Each player in the circle will be chosen as the starter** exactly twice**
- Total chat rounds = **2 × number of players in the circle**
- The system ensures fair rotation so everyone gets equal guessing opportunities and everyone plays both roles (starter & non-starter).
## 🏆 Scoring System
- Correct guess: +5 points
- Wrong guess: −5 points
- Scores can go negative
- After all rounds finish the player with the highest total score wins

## ⚖️ Tie-Breaker Rules
- If the highest score is tied:
### If more than 2 players are tied:
- An extra round is played only among the tied players
### If exactly 2 players are tied:
- The system randomly selects an object
- All other players can describes the object to those two players in a chat
- While tied player try to guess it
- The first one with correct guess wins the game

# Tech Stack

- Frontend : React + Vite
- Backend : Cloudflare Workers (for logic and websockets) + Supbase (for database and auth)
- Hosting : Cloudflare Pages