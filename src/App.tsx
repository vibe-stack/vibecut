import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../app/routes/home';
import '../app/app.css';

function App() {
  return (
    <BrowserRouter basename="/vibecut">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;