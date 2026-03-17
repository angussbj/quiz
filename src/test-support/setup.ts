import { TextEncoder, TextDecoder } from 'util';

Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom doesn't implement scrollTo — framer-motion calls it during animations
window.scrollTo = () => {};

import '@testing-library/jest-dom';
