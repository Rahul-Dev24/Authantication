import { useNavigate } from 'react'
import { AppData } from '../context/AppContext';

const Home = () => {

    const { logoutUser } = AppData();
    // const navicate = useNavigate()

    return (
        <>
            <div className='flex items-center justify-end p-6'>
                <button className='border-none bg-red-500 text-white rounded-md p-3' onClick={() => logoutUser(navicate)}>Logout</button>
            </div>
        </>
    )
}

export default Home