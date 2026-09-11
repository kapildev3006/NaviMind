import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#111',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>NaviMind 3D City Simulator</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#aaa' }}>
        Welcome to the autonomous navigation testing environment.
      </p>
      
      <Link 
        href="/simulation"
        style={{
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          transition: 'background 0.2s'
        }}
      >
        Enter Simulation
      </Link>
    </div>
  )
}
