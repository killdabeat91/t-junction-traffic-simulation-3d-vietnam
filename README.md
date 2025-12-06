# T-Junction Traffic Simulation 3D Vietnam

A web-based 3D traffic simulation built with Three.js, featuring realistic vehicle behaviors, traffic light logic, and a detailed environment.

<img width="1013" height="443" alt="image" src="https://github.com/user-attachments/assets/9a8ddf35-e8eb-4b60-bb32-1d615fe1b8c9" />


## Features

- **Realistic Traffic Logic**:
  - Vehicles follow traffic lights and right-of-way rules.
  - **Lane Changing**: Vehicles intelligently switch lanes to overtake slower traffic or prepare for turns.
  - **Motorcycle Behavior**: Motorcycles filter through traffic, use specific lanes, and follow local traffic rules (e.g., right turn on red).
  - **Yielding**: Vehicles yield to oncoming traffic when turning left.

- **Diverse Vehicle Types**:
  - **Cars**: Standard behavior, brake lights, turn signals.
  - **Motorcycles**: Agile, faster acceleration, lane filtering.
  - **Trucks & Containers**: Slower, larger turning radius, occupy outer lanes.

- **Detailed Environment**:
  - 3D intersection with asphalt roads, sidewalks, and grass.
  - **Traffic Lights**: Functional traffic lights with countdown timers and specific signals for motorcycles.
  - **Decorations**: Cartoon-style trees, billboards, and street markings.
  - **Day/Night Cycle**: Dynamic lighting and shadows.

- **Interactive Controls**:
  - **Camera**: Orbit controls to view the intersection from any angle.
  - **Simulation Settings**: Adjust traffic flow, signal timing, and time scale in real-time.
  - **Statistics**: Real-time dashboard showing vehicle counts, throughput, and wait times.

## Tech Stack

- **Core**: HTML5, JavaScript (ES6+)
- **Rendering**: [Three.js](https://threejs.org/)
- **Styling**: CSS3

## Installation & Running

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/killdabeat91/t-junction-traffic-simulation-3d-vietnam
    cd t-junction-traffic-simulation-3d-vietnam
    ```

2.  **Run a local server**:
    Because the project uses ES6 modules, it must be served via HTTP, not `file://`.

    *   **Python 3**:
        ```bash
        python -m http.server 8080
        ```
    *   **Node.js (http-server)**:
        ```bash
        npx http-server .
        ```
    *   **VS Code**: Use the "Live Server" extension.

3.  **Open in Browser**:
    Navigate to `http://localhost:8080` in your web browser.

## Project Structure

```
traffic-simulation/
├── css/
│   └── style.css          # UI styling
├── js/
│   ├── components/
│   │   ├── Environment.js # Road, terrain, and props generation
│   │   ├── TrafficLight.js# Traffic light meshes and logic
│   │   └── Vehicle.js     # Vehicle class, movement, and AI
│   ├── constants.js       # Global configuration constants
│   ├── main.js            # Main entry point, scene setup, and loop
│   └── utils.js           # Helper functions (path generation, math)
├── index.html             # Main HTML file
└── README.md              # Project documentation
```

## Customization

You can tweak the simulation parameters in `js/main.js` or `js/constants.js`:

- **Traffic Flow**: Adjust `flowMain` and `flowSide` in `sim` config.
- **Signal Timing**: Modify `config` object in `sim`.
- **Vehicle Speeds**: Change `maxSpeed` in `Vehicle.js`.

## License

This project is open source and available under the [MIT License](LICENSE).



