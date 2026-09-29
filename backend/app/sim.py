import numpy as np
B=(66.0,99.0,5.0,38.0)
FR=list(range(-60,181,15))
NOW=4
CITIES=[("Delhi",77.2,28.6),("Lucknow",80.95,26.85),("Bhopal",77.4,23.26),("Mumbai",72.85,19.07),("Kolkata",88.36,22.57),("Patna",85.14,25.6),("Guwahati",91.75,26.14),("Hyderabad",78.48,17.38),("Bengaluru",77.59,12.97),("Chennai",80.27,13.08),("Nagpur",79.09,21.15),("Jaipur",75.79,26.91)]
CELLS=[dict(x=75,y=23.6,vx=.9,vy=-.05,r=1.5,p=58,t=60,w=110),dict(x=78.2,y=27,vx=1,vy=-.05,r=1.3,p=55,t=120,w=100),dict(x=86.2,y=22.8,vx=.8,vy=-.1,r=1.6,p=62,t=140,w=110),dict(x=89.6,y=26.6,vx=.9,vy=0,r=1.2,p=52,t=100,w=100),dict(x=77.4,y=20.1,vx=.7,vy=-.15,r=1.5,p=50,t=90,w=110),dict(x=70.5,y=18.8,vx=.9,vy=.1,r=1.3,p=48,t=110,w=100),dict(x=78.3,y=12.6,vx=.8,vy=.1,r=1.2,p=45,t=130,w=100),dict(x=76.2,y=28.9,vx=.5,vy=-.1,r=1.4,p=60,t=-20,w=70),dict(x=75.8,y=13.4,vx=.6,vy=-.1,r=1,p=44,t=60,w=80)]

def cells_at(t,cells=CELLS):
    return [dict(cx=c["x"]+c["vx"]*t/60,cy=c["y"]+c["vy"]*t/60,rr=c["r"]*(1+.25*max(0,t)/60),I=c["p"]*np.exp(-((t-c["t"])/c["w"])**2)) for c in cells]

def point(lo,la,t,cells=CELLS):
    v=8.0
    for c in cells_at(t,cells):
        v=max(v,c["I"]*np.exp(-((lo-c["cx"])**2+(la-c["cy"])**2)/c["rr"]**2))
    return float(v)

def sat_point(lo,la,t,cells=CELLS):
    s=0.0
    for c in cells_at(t,cells):
        s=max(s,min(1,c["I"]/50)*np.exp(-((lo-c["cx"])**2+(la-c["cy"])**2)/(4.8*c["rr"]**2)))
    return 285-85*s

def fields(t,n=64):
    lo=np.linspace(B[0],B[1],n)
    la=np.linspace(B[3],B[2],n)
    LO,LA=np.meshgrid(lo,la)
    z=np.full((n,n),8.0)
    s=np.zeros((n,n))
    for c in cells_at(t):
        d=(LO-c["cx"])**2+(LA-c["cy"])**2
        z=np.maximum(z,c["I"]*np.exp(-d/c["rr"]**2))
        s=np.maximum(s,min(1,c["I"]/50)*np.exp(-d/(4.8*c["rr"]**2)))
    tb=285-85*s+5*np.sin(LO*1.3)*np.cos(LA*1.7)
    return z,tb

def lightning(t,seed):
    r=np.random.default_rng(seed)
    out=[]
    for c in cells_at(t):
        if c["I"]<38:
            continue
        n=int(round((c["I"]-30)*1.6))
        a=r.uniform(0,6.28,n)
        d=np.sqrt(r.uniform(0,1,n))*c["rr"]*.9
        out+=[[round(float(c["cx"]+np.cos(x)*k),3),round(float(c["cy"]+np.sin(x)*k),3)] for x,k in zip(a,d)]
    return out

def rand_cells(r):
    return [dict(x=r.uniform(68,95),y=r.uniform(8,32),vx=r.uniform(.4,1),vy=r.uniform(-.2,.2),r=r.uniform(1,1.8),p=r.uniform(40,65),t=r.uniform(-30,150),w=r.uniform(60,120)) for _ in range(r.integers(3,8))]
