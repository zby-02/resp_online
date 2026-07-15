# README
An online tool for batch preprocessing and analysis of respiratory sound (lung sound) audio files. Designed for research and educational purposes, it provides signal enhancement, noise suppression, physiological parameter estimation, and visualization.

## Feature
- **Batch Processing** – Upload up to 8 audio files at once (MP3, WAV, M4A, AAC, OGG, FLAC).
- **Signal Enhancement** – Adjustable gain amplification.
- **Noise Suppression** – Adaptive environmental noise reduction, friction noise removal (stethoscope against skin/clothing), and heart sound cancellation via heuristic ML algorithm.
- **Physiological Estimation** – Estimate respiratory rate (RR) and heart rate (HR) with confidence scores.
- **Adventitious Sound Detection** – Automatic detection of suspected wheezes and crackles.
- **Phase Visualization** – Heuristic inspiration/expiration labeling overlaid on spectrograms.
- **Interactive Selection** – Manually select background noise regions on waveform before processing.
- **Customizable Parameters** – Toggle noise reduction, friction suppression, heart sound suppression, RR/HR estimation, and crackle/wheeze detection.
- **Output** – Processed MP3 downloads, before/after spectrograms (with phase marks), statistical metrics (RMS, duration, sample rate), and a ZIP archive of all results.

## Introduction
This repository is the frontend part of pre-processing of respiratory sound captured by digital stethoscope. We coded this project in order to reduce the noise of rubbing or environment. Also, we intended to mark respiratory phase using enlightened algorithm.

## Tech Stack
| Layer       | Technology                         |
|-------------|------------------------------------|
| Frontend    | HTML, CSS, JavaScript (vanilla) hosted on GitHub Pages |
| Backend     | Python FastAPI                     |
| Audio Processing | scipy, librosa, numpy          |
| Deployment  | Alibaba Cloud ECS + Nginx reverse proxy |

## Architecture
Frontend of this project is deployed on GitHub page, and the backend is deployed on another web server. Detailed information is available by asking zby0721.

## Acknowledgement
This is a **Vibe-Coding** project. Special thanks to ChatGPT, Deepseek, and Gemini for their assistance in coding and debugging.

- **FastAPI** – Backend framework
- **scipy**, **librosa**, **numpy** – Signal processing and feature extraction

## Disclaimer
- This tool is intended for **research and educational purposes only**. It does **not** provide clinical diagnoses.
- This tool was built for **our team** based on our specific needs; it may not be directly suitable for other researchers without modification.
- Contributions are welcome! If you find any issues or have suggestions, please open an issue or submit a pull request.
- All outputs are heuristic estimates and should be interpreted with caution.

## License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

*For questions or feedback, please open an issue on this repository.*

