import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
