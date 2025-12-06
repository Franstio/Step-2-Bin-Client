
import  {  useState, useEffect } from 'react';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import axios from "axios";
import io from 'socket.io-client';
import GaugeComponent from 'react-gauge-component'
import {HubConnectionBuilder,HubConnectionState} from '@microsoft/signalr';
const apiClient = axios.create({
    withCredentials: false,
    timeout: 4000
});
const socket =  io(`http://${import.meta.env.VITE_TIMBANGAN}/`,{
    reconnection: true,
    autoConnect: true,
});
const localSocket = new HubConnectionBuilder().withUrl("http://localhost:5000/hub/bin").withAutomaticReconnect().build();

function App() {
  const [allowReopen,setAllowReopen] = useState(localStorage.getItem('allowReopen') == null|| localStorage.getItem('allowReopen') == "" ? false : JSON.parse(localStorage.getItem('allowReopen')!));
  const [hostname, setHostname] = useState('');
//  const [isSubmitAllowed, setIsSubmitAllowed] = useState(false);
  //const [Getweightbin, setGetweightbin] = useState(localStorage.getItem("WeightBin") == "" || localStorage.getItem("WeightBin")=="undefined" ?  0 : parseFloat(localStorage.getItem("WeightBin")));
  const [instruksimsg, setinstruksimsg] = useState(localStorage.getItem('instruksimsg') == "null" ? "" : localStorage.getItem("instruksimsg"));
  const [bottomLockEnable, setBottomLock] = useState(localStorage.getItem('bottomLockEnable') == null || localStorage.getItem('bottomLockEnable') == "" ? false:  JSON.parse(localStorage.getItem('bottmLockEnable')!));
  const [type, setType] = useState(localStorage.getItem('type'));
  const [sensor,setSensor] = useState([0,0]);
 // const [maxWeight,setMaxWeight] = useState(localStorage.getItem('maxWeight')== "" || localStorage.getItem('maxWeight') == null ? 0 : parseFloat(localStorage.getItem('maxWeight')));
  const [ipAddress, setIpAddress] = useState('');
  const [bin,setBin] = useState(localStorage.getItem('bin') == "" || localStorage.getItem('bin') == undefined || localStorage.getItem("bin")=="undefined" ? null : JSON.parse(localStorage.getItem('bin')!));

  /*useEffect(()=>{
      localStorage.setItem("WeightBin",Getweightbin);
  },[Getweightbin])*/
  useEffect(()=>{

      localStorage.setItem('instruksimsg',instruksimsg == null || instruksimsg == "null" ? "" : instruksimsg);
  },[instruksimsg])
  useEffect(()=>{
      
      localStorage.setItem('type',type ?? "");
  },[type])

  useEffect(()=>{
      localStorage.setItem('bin',JSON.stringify(bin));
  },[bin])
  /*useEffect(()=>{
      
      localStorage.setItem('maxWeight',maxWeight);
  },[maxWeight])*/
  useEffect(()=>{
      
      localStorage.setItem('allowReopen',allowReopen);
  },[allowReopen])
  useEffect(()=>{
      localStorage.setItem('bottmLockEnable',bottomLockEnable);
  },[bottomLockEnable])
  useEffect(()=>{
      const getIp =async ()=>{
          try
          {
          const ip = await apiClient.get(`http://localhost:5000/ip`);
              setIpAddress(ip.data[0] );
          }
          catch
          {
              getIp();
          }
      };
      getIp();
  },[])
  useEffect(() => {
      if (!localSocket)
          return;
       localSocket.start();
      localSocket.on('UpdateInstruksi', (instruksi) => {
          setinstruksimsg(instruksi);
          /*if (instruksi && instruksi != '' && instruksi != null)
          {
          }*/
      });
      localSocket.on('reload',()=>{
          localStorage.clear();
          window.location.reload();
      });
      const checkLampRed = ()=>{
          console.log(localStorage.getItem("bin"));
          if (localStorage.getItem("bin") == "" || localStorage.getItem("bin")=="undefined" || localStorage.getItem("bin") == null)  
             
          {setBin({weight:0,max_Weight:1});}
          else
          {
              const binData = JSON.parse(localStorage.getItem("bin")!);
              console.log(binData);
              setBin({...binData});
//              localSocket.emit("TriggerWeight",binData);
          }
      }
      localSocket.on('refresh',function (){
          checkLampRed();
//            io.emit('TriggerWeight',binData);
      });
      localSocket.on('GetType', (type) => {
        setType(type);
    });
    localSocket.on('reopen',(lock)=>{
        setAllowReopen(lock.reopen);
        console.log(type);
        const check = type=="Collection";
        console.log(check);
        setBottomLock(...check);
    })
    localSocket.on('Bin',(_bin)=>{
        console.log(_bin);
        setBin(()=>({..._bin}));
    })
    localSocket.on('sensorUpdate',(data)=>{
        if (!data)
            return;
        const _data = [];
        for (let i=0;i<data.length;i++)
        {
            _data.push(data[i] ?? 0);
        }
        setSensor(_data);
    });
    //   const intervalId = setInterval(()=>{
    //       checkLampRed()
    //   },5000);
    //   return ()=>clearInterval(intervalId);
  }, [localSocket]);
  
  useEffect(() => {
      axios.get('http://localhost:5000/hostname', { withCredentials: false })
          .then(response => {

              setHostname(response.data.hostname);
          })
          .catch(error => {
              console.log('Error fetching the hostname:', error);
          });
  }, []);
  useEffect(() => {
      if (!socket)
          return;
      if (hostname && hostname != '')
      {
          
          socket.emit('getWeightBin', hostname);
          setInterval(()=>{
              socket.emit('getWeightBin', hostname);
          },30*1000);
      }
  }, [hostname, socket]);
  useEffect(() => {
      /*socket.on('connect', ()=>{
          socket.emit('getWeightBin',hostname);
      });*/
      if (!socket)
          return;
//       socket.on('getweight', (data) => {
//           setBin(()=>({
//               ...bin,
//               weight: data.weight,
//               max_weight: data.max_weight,
//               pending: data.pending
//           }));
// //          localSocket.emit('binInfo',data);
// //            setGetweightbin(prev => data.weight);
// //            setMaxWeight(data.max_weight);
//       });
  }, [socket]);





  const handleSubmit = async () => {
      await apiClient.post("http://localhost:5000/End",{
          bin:{
              ...bin,
              weight: 0,
              type: "Collection"
          }
      });
      //sendLockBottom();
      setBottomLock(false);
      setinstruksimsg("");
//       setinstruksimsg("Buka pintu bawah");
  }
  const handleReopen = async ()=>{
      const url = `http://localhost:5000/${ type=='Collection' ? 'lockBottom' : 'lockTop'}`;
      const payload = type=='Collection' ? {idLockBottom:1} : {idLockTop:1};
      await apiClient.post(url,{...payload});
  }
  // Menghitung nilai gaugeValue sesuai dengan aturan yang ditentukan
  const getGaugeValue = () => {
      const _final = ((parseFloat(bin?.weight ?? 0)) / (parseFloat(bin?.max_Weight ?? 0)) * 100);
      console.log(bin);
      return (_final  >= 100) ? 100 : _final;
  };
// Dapatkan nilai GaugeComponent yang sesuai
  return (
      <main>
          <div className='bg-gray-400 p-5'>
              <div className="flex justify-center gap-10">
                  <div className='flex-1 p-4 border rounded bg-white'>
                      <h1 className='text-center text-blue-600 font-semibold'>Weight</h1>
                      <div className='flex justify-center'>
                          <GaugeComponent
                              arc={{

                                  subArcs: [
                                      {
                                          limit: 20,
                                          color: 'GREEN',
                                          showTick: true
                                      },
                                      {
                                          limit: 90,
                                          color: 'YELLOW',
                                          showTick: true
                                      },
                                      {
                                          limit: 100,
                                          color: 'RED',
                                          showTick: true
                                      },
                                  ]
                              }}
                              value={getGaugeValue()}
                              style={{ width: '100%', height: '20%' }} // Ensure the gauge fits the container
                          />

                      </div>
                      <p className='flex justify-center text-xl'>{bin?.weight ?? 0}Kg</p>
                  </div>

                  <div className='flex-1 p-4 border rounded max-w-md bg-white'>
                      <h1 className='text-center text-blue-600 font-semibold'>Status</h1>

                      <div className='flex justify-between'>
                          <p className=''>Green</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color:  (sensor[4] == 0? 'gray' : 'green') }} />
                      </div>
                      <div className='flex justify-between'>
                          <p>Yellow</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color:  (sensor[3] == 0? 'gray' : 'green')  }} />
                      </div>
                      <div className='flex justify-between'>
                          <p>Red</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color:  (sensor[2] == 0? 'gray' : 'green') }} />
                      </div>
                      <div className='mt-20'>
                      <p className='flex justify-center font-semibold text-blue-600'>Instruksi</p>
                      <p className='flex justify-center text-xl'>{instruksimsg}</p>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center gap-10 mt-10">
                  <div className='flex-1 p-4 border rounded bg-white'>
                      <h1 className='font-semibold text-blue-600 text-center'>Sensor Status</h1>
                      <div className='flex justify-between'>
                          <p className=''>Top</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color: (sensor[0] == 0 ? 'gray' : 'green') }} />
                      </div>

                      <div className='flex justify-between'>
                          <p>Bottom</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color: (sensor[1]==0 ? 'gray' : 'green')  }} />
                      </div>
                  </div>
                  <div className='flex-1 p-4 border rounded max-w-md bg-white'>
                      <h1 className='text-center font-semibold text-blue-600'>Lock Status</h1>

                      <div className='flex justify-between'>
                          <p className=''>Top</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color: (sensor[5] == 0? 'gray' : 'green') }} />
                      </div>

                      <div className='flex justify-between'>
                          <p>Bottom</p>
                          <FiberManualRecordIcon fontSize="small" style={{ color:  (sensor[6] == 0? 'gray' : 'green')}} />
                      </div>
                  </div>
                  {
                      allowReopen && !bottomLockEnable ? 
                      <button
                      className={`flex-1 p-4 border rounded max-w-xs flex justify-center items-center font-semibold ${allowReopen  ? 'bg-blue-500 text-white' : 'bg-white text-black'
                          }`}
                      disabled={!allowReopen}
                      onClick={handleReopen}
                  >
                      Reopen Lock
                  </button>
                      :
                  <button
                      className={`flex-1 p-4 border rounded max-w-xs flex justify-center items-center font-semibold ${bottomLockEnable ? 'bg-blue-500 text-white' : 'bg-white text-black'
                          }`}
                      disabled={!bottomLockEnable}
                      onClick={handleSubmit}
                  >
                      Lock Bottom
                  </button>
                  }
              </div>
          </div>
          <footer className='flex-1 rounded border flex justify-center gap-40 p-3 bg-white'  >
              <p>Server Status: {ipAddress} {socket?.connected ? "Online":"Offline"}</p>
              <p>Status PLC : {localSocket?.state == HubConnectionState.Connected ? "Online": "Offline"}</p>        
              <p>Version : { import.meta.env.VITE_VERSION} </p>
          </footer>
      </main>
  );
}

export default App
