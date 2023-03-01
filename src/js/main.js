// Import our custom CSS
import '../scss/styles.scss'

// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap'

// Import three.js and vanta.js for the background animation
import * as THREE from 'three'
import WAVES from 'vanta/dist/vanta.waves.min'

WAVES({
    el: "#anim-bg",
    THREE: THREE,
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    color: 0x51086a,
    shininess: 57.00,
    waveHeight: 20.00,
    zoom: 1.00
  })