import { Canvas } from './components/Canvas/Canvas';
import { InfoButton } from './components/InfoButton/InfoButton';
import imageManifest from './data/images.json';
import type { ImageManifest } from './types';

const manifest = imageManifest as ImageManifest;

function App() {
  return (
    <>
      <Canvas images={manifest.images} />
      <InfoButton />
    </>
  );
}

export default App;
