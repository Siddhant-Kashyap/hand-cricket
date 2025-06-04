import { useNavigate } from 'react-router-dom';
import bg from '../assets/cricket-match-with-player.jpg';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="w-screen h-screen flex flex-col justify-center items-center text-white"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <h1 className="text-4xl font-bold mb-4">Welcome to Hand Cricket</h1>
      <button 
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        onClick={() => navigate('/game')}
      >
        Go to Match
      </button>
    </div>
  )
}

export default LandingPage