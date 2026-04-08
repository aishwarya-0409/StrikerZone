# 🧟 StrikerZone: The Voxel Rescue Ops

**StrikerZone** is a high-fidelity, co-op survival zombie shooter built with **Three.js**, **Cannon-es**, and **Socket.io**. Navigate a procedurally generated voxel town, rescue survivors, and hold back the shifting waves of the undead.

## 🕹️ Game Features

*   **Voxel Art Style**: A consistent and polished low-poly aesthetic for all characters, weapons, and environments.
*   **Animated Characters**: Real limb animations for walking, attacking, and idling.
*   **Rescue Missions**: Find survivors (yellow radar dots) and escort them back to the green **Rescue Zone** for massive bonuses.
*   **Tactical Environment**: A procedurally generated ruined town with buildings, narrow alleys, and dynamic lighting.
*   **Advanced Gunplay**: Using a custom voxel rifle with realistic recoil, weapon sway, and high-impact "chunk" particles.
*   **Survival Immersion**: Low-health heartbeat audio, screen desaturation effects, and a tactical HUD.

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16 or higher)

### Installation
1.  **Server Setup**:
    ```bash
    cd server
    npm install
    ```
2.  **Client Setup**:
    ```bash
    cd ../client
    npm install
    ```

### Running the Game
1.  **Start the Backend**:
    ```bash
    cd server
    npm start
    ```
2.  **Start the Frontend**:
    ```bash
    cd client
    npm run dev
    ```
3.  **Open in Browser**: Visit `http://localhost:5173` (or the port shown in your terminal).

## 🎮 Controls

*   **WASD**: Movement
*   **Mouse**: Aim / Look
*   **Left Click**: Shoot
*   **R**: Reload
*   **F**: Respawn (when down)
*   **ESC**: Pause / Settings

## 🛠️ Technical Stack
*   **Engine**: [Three.js](https://threejs.org/)
*   **Physics**: [Cannon-es](https://github.com/pmndrs/cannon-es)
*   **Multiplayer**: [Socket.io](https://socket.io/)
*   **Bundler**: [Vite](https://vitejs.dev/)
*   **Audio**: [Howler.js](https://howlerjs.com/)

---


