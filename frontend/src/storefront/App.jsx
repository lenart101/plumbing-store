
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { Separator } from '../components/ui/separator.jsx'
import { ShoppingCart, Phone, Mail, MapPin, Search, Lock, LogOut, PlusCircle, Edit3, Trash2, Image as ImageIcon, Save } from 'lucide-react'
import emailjs from 'emailjs-com'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function formatEUR(n){
  try { return new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(n) }
  catch { return `${Number(n).toFixed(2)} €` }
}

function useBackendInventory(){
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([
        fetch(`${API_BASE}/categories`).then(r=>r.json()),
        fetch(`${API_BASE}/products`).then(r=>r.json()),
      ])
      setCategories(c)
      setProducts(p)
    } catch(e){ console.error(e) } finally { setLoading(false) }
  }
  useEffect(()=>{ loadAll() }, [])

  const addCategory = async (name) => {
    if(!name) return
    const res = await fetch(`${API_BASE}/categories`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name})
    })
    const data = await res.json()
    setCategories(prev => [...prev, data.name])
  }
  const removeCategory = async (name) => {
    await fetch(`${API_BASE}/categories/${encodeURIComponent(name)}`, { method:'DELETE' })
    setCategories(prev => prev.filter(x=>x!==name))
  }

  const upsertProduct = async (product, file) => {
    let imageUrl = product.image || ''
    if(file){
      const form = new FormData()
      form.append('image', file)
      const up = await fetch(`${API_BASE}/upload`, { method:'POST', body: form })
      const upData = await up.json()
      imageUrl = upData.imageUrl
    }
    const payload = { ...product, image: imageUrl }
    if(!product.id){
      const res = await fetch(`${API_BASE}/products`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json()
      setProducts(ps => [data, ...ps])
      return data
    } else {
      const res = await fetch(`${API_BASE}/products/${product.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json()
      setProducts(ps => ps.map(p => p.id===data.id ? data : p))
      return data
    }
  }
  const deleteProduct = async (id) => {
    await fetch(`${API_BASE}/products/${id}`, { method:'DELETE' })
    setProducts(ps => ps.filter(p=>p.id!==id))
  }

  return { loading, categories, products, addCategory, removeCategory, upsertProduct, deleteProduct }
}

function AdminLogin({ onLogin }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const handle = (e) => {
    e.preventDefault()
    if(email==='admin@site.com' && password==='admin123') onLogin({email})
    else alert('Napačen email ali geslo.')
  }
  return (
    <form onSubmit={handle} className="card" style={{padding:'1rem', maxWidth:420, margin:'0 auto'}}>
      <h3 style={{fontSize:'1.25rem', fontWeight:600, display:'flex', alignItems:'center', gap:8}}><Lock size={16}/> Admin prijava</h3>
      <div style={{marginTop:8}}>
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@site.com" required/>
      </div>
      <div style={{marginTop:8}}>
        <Label>Geslo</Label>
        <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required/>
      </div>
      <Button type="submit" className="primary" style={{width:'100%', marginTop:12}}>Prijava</Button>
    </form>
  )
}

function ImagePicker({ value, file, onUrlChange, onFileChange }){
  const fileRef = useRef(null)
  const onFile = (f)=>{
    onFileChange(f)
    const reader = new FileReader()
    reader.onload = ()=> onUrlChange(reader.result)
    reader.readAsDataURL(f)
  }
  return (
    <div style={{display:'grid', gap:8}}>
      <Label>Slika (URL ali datoteka)</Label>
      <div style={{display:'flex', gap:8}}>
        <Input value={value||''} onChange={(e)=>onUrlChange(e.target.value)} placeholder="https://..."/>
        <Button type="button" onClick={()=>fileRef.current?.click()}><ImageIcon size={16}/> Naloži</Button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={(e)=> e.target.files?.[0] && onFile(e.target.files[0]) }/>
      </div>
      {value ? <img src={value} alt="Predogled" style={{maxHeight:190, width:'100%', objectFit:'cover', border:'1px solid #e5e7eb', borderRadius:8}}/> : null}
      {file ? <div style={{fontSize:12, color:'#6b7280'}}>Izbrana datoteka: {file.name}</div> : null}
    </div>
  )
}

function ProductEditor({ initial, categories, onSave, onCancel }){
  const [form, setForm] = useState(initial || { id: undefined, name:'', description:'', category: categories[0] || 'Drugo', price: 0, image:'' })
  const [file, setFile] = useState(null)
  const set = (k,v)=> setForm(f=>({ ...f, [k]: v }))
  const submit = async (e)=>{ e.preventDefault(); await onSave({ ...form, price: Number(form.price) || 0 }, file); setFile(null) }
  return (
    <form onSubmit={submit} className="card" style={{padding:'1rem', display:'grid', gap:12}}>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div>
          <Label>Naziv</Label>
          <Input value={form.name} onChange={(e)=>set('name', e.target.value)} required/>
        </div>
        <div>
          <Label>Kategorija</Label>
          <select className="input" value={form.category} onChange={(e)=>set('category', e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{gridColumn:'1 / -1'}}>
          <Label>Opis</Label>
          <Textarea rows={3} value={form.description} onChange={(e)=>set('description', e.target.value)} required/>
        </div>
        <div>
          <Label>Cena (€)</Label>
          <Input type="number" step="0.01" value={form.price} onChange={(e)=>set('price', e.target.value)} required/>
        </div>
      </div>
      <ImagePicker value={form.image} file={file} onUrlChange={(v)=>set('image', v)} onFileChange={setFile}/>
      <div style={{display:'flex', justifyContent:'end', gap:8}}>
        <Button type="button" onClick={onCancel} className="btn">Prekliči</Button>
        <Button type="submit" className="primary"><Save size={16}/> Shrani</Button>
      </div>
    </form>
  )
}

function AdminPanel({ inv, onLogout }){
  const { categories, products, addCategory, removeCategory, upsertProduct, deleteProduct } = inv
  const [addingCat, setAddingCat] = useState('')
  const [editing, setEditing] = useState(null)
  return (
    <div className="container" style={{padding:'1.5rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{fontSize:'1.5rem', fontWeight:700}}>Admin – Urejanje kataloga</h2>
        <Button onClick={onLogout}><LogOut size={16}/> Odjava</Button>
      </div>
      <div className="grid" style={{gridTemplateColumns:'1fr 2fr', gap:16}}>
        <div className="card" style={{padding:'1rem'}}>
          <h3 style={{fontWeight:600, marginBottom:12}}>Kategorije</h3>
          <div style={{display:'flex', gap:8, marginBottom:12}}>
            <Input placeholder="Nova kategorija" value={addingCat} onChange={(e)=>setAddingCat(e.target.value)} />
            <Button onClick={()=>{ addCategory(addingCat.trim()); setAddingCat('') }}><PlusCircle size={16}/>Dodaj</Button>
          </div>
          <ul style={{display:'grid', gap:8}}>
            {categories.map(c => (
              <li key={c} style={{display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px'}}>
                <span>{c}</span>
                <Button onClick={()=>removeCategory(c)} className="btn"><Trash2 size={16}/></Button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 style={{fontWeight:600, margin:'4px 0 8px'}}>{editing ? 'Uredi izdelek' : 'Dodaj nov izdelek'}</h3>
          <ProductEditor key={editing?.id || 'new'} initial={editing} categories={categories.length?categories:['Drugo']} onSave={async (p,f)=>{ await upsertProduct(p,f); setEditing(null) }} onCancel={()=>setEditing(null)} />
          <div className="separator"></div>
          <h3 style={{fontWeight:600, marginBottom:8}}>Obstoječi izdelki</h3>
          <div className="grid products">
            {products.map(p => (
              <Card key={p.id}>
                <div style={{aspectRatio:'4/3', background:'#f1f5f9', overflow:'hidden'}}>
                  <img src={p.image} alt={p.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                </div>
                <CardContent>
                  <div style={{fontWeight:600}}>{p.name}</div>
                  <div style={{fontSize:12, opacity:.7}}>{p.category} • {formatEUR(p.price)}</div>
                  <div style={{display:'flex', gap:8, marginTop:8}}>
                    <Button onClick={()=>setEditing(p)}><Edit3 size={16}/> Uredi</Button>
                    <Button onClick={()=>deleteProduct(p.id)} className="btn"><Trash2 size={16}/> Izbriši</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Storefront(){
  const inv = useBackendInventory()
  const { categories, products, loading } = inv
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Vse')
  const [formData, setFormData] = useState({ ime:'', email:'', sporocilo:'' })
  const [admin, setAdmin] = useState(null)
  const [mode, setMode] = useState('store')

  const addToCart = (product)=> setCart(c=>[...c, product])

  const filteredProducts = useMemo(()=> (
    products.filter(product =>
      (selectedCategory==='Vse' || product.category===selectedCategory) &&
      (product.name + product.description).toLowerCase().includes(search.toLowerCase())
    )
  ), [products, selectedCategory, search])

  const handleSubmit = (e)=>{
    e.preventDefault()
    emailjs.send('YOUR_SERVICE_ID','YOUR_TEMPLATE_ID',{ ime: formData.ime, email: formData.email, sporocilo: formData.sporocilo },'YOUR_PUBLIC_KEY')
      .then(()=>{ alert('Povpraševanje uspešno poslano!'); setFormData({ ime:'', email:'', sporocilo:'' }) })
      .catch(()=> alert('Prišlo je do napake pri pošiljanju.'))
  }

  const Header = (
    <header className="sticky" style={{background:'#1d4ed8', color:'#fff', padding:'1rem', boxShadow:'0 1px 2px rgba(0,0,0,.15)'}}>
      <div className="container" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
        <div style={{fontSize:'1.5rem', fontWeight:700}}>Vodovodni Material</div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {mode==='store' && (
            <div style={{display:'flex', alignItems:'center', gap:6, opacity:.9}}>
              <ShoppingCart />
              <span>{cart.length}</span>
            </div>
          )}
          {admin ? (
            <Button onClick={()=>{ setAdmin(null); setMode('store') }}><LogOut size={16}/> Odjava</Button>
          ) : (
            <Button onClick={()=> setMode(mode==='admin' ? 'store' : 'admin')}><Lock size={16}/> Admin</Button>
          )}
        </div>
      </div>
    </header>
  )

  if(mode==='admin'){
    return (
      <div style={{minHeight:'100vh', background:'#f1f5f9'}}>
        {Header}
        <div className="container" style={{padding:'1.5rem 0'}}>
          {admin ? <AdminPanel inv={inv} onLogout={()=>{ setAdmin(null); setMode('store') }} /> : <AdminLogin onLogin={(u)=>setAdmin(u)} />}
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh', background:'#f3f4f6'}}>
      {Header}

      <div className="container" style={{padding:'1rem', display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', justifyContent:'space-between'}}>
        <div style={{position:'relative', width:'100%', maxWidth:540}}>
          <Search style={{position:'absolute', left:10, top: '50%', transform:'translateY(-50%)', color:'#9ca3af'}}/>
          <input type="text" placeholder="Išči izdelke..." className="input" style={{paddingLeft:36}} value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <Button className={selectedCategory==='Vse'?'primary':''} onClick={()=>setSelectedCategory('Vse')}>Vse</Button>
          {categories.map(cat => (
            <Button key={cat} className={selectedCategory===cat?'primary':''} onClick={()=>setSelectedCategory(cat)}>{cat}</Button>
          ))}
        </div>
      </div>

      <main className="container" style={{padding:'2rem 0'}}>
        {loading ? (
          <p style={{textAlign:'center', color:'#6b7280'}}>Nalagam...</p>
        ) : filteredProducts.length ? (
          <div className="grid products">
            {filteredProducts.map(product => (
              <Card key={product.id}>
                <img src={product.image} alt={product.name} style={{width:'100%', height:200, objectFit:'cover'}} />
                <CardContent>
                  <h2 style={{fontSize:'1.1rem', fontWeight:600}}>{product.name}</h2>
                  <p style={{fontSize:14, color:'#4b5563'}}>{product.description}</p>
                  <p style={{color:'#1d4ed8', fontWeight:700, marginTop:8}}>{formatEUR(product.price)}</p>
                  <Button style={{width:'100%', marginTop:10}} onClick={()=>addToCart(product)}>Dodaj v košarico</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p style={{textAlign:'center', color:'#6b7280'}}>Ni najdenih izdelkov.</p>
        )}
      </main>

      <section style={{background:'#fff', borderTop:'1px solid #e5e7eb', padding:'2rem 0'}}>
        <div className="container" style={{textAlign:'center'}}>
          <h2 style={{fontSize:'1.5rem', fontWeight:700}}>Kontaktirajte nas</h2>
          <p style={{color:'#4b5563'}}>Za dodatne informacije nas lahko vedno kontaktirate.</p>
          <div style={{display:'flex', justifyContent:'center', gap:16, marginTop:16, flexWrap:'wrap', color:'#374151'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}><Phone color="#1d4ed8"/><span>+386 40 123 456</span></div>
            <div style={{display:'flex', alignItems:'center', gap:8}}><Mail color="#1d4ed8"/><span>info@vodovod.si</span></div>
            <div style={{display:'flex', alignItems:'center', gap:8}}><MapPin color="#1d4ed8"/><span>Ljubljana, Slovenija</span></div>
          </div>

          <form onSubmit={handleSubmit} style={{maxWidth:560, margin:'2rem auto 0', textAlign:'left'}} className="card">
            <div style={{padding:'1rem', display:'grid', gap:12}}>
              <div>
                <label className="label">Ime in priimek</label>
                <input type="text" className="input" value={formData.ime} onChange={(e)=>setFormData({...formData, ime: e.target.value})} required/>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} required/>
              </div>
              <div>
                <label className="label">Sporočilo</label>
                <textarea className="input" rows={4} value={formData.sporocilo} onChange={(e)=>setFormData({...formData, sporocilo: e.target.value})} required/>
              </div>
              <Button type="submit" className="primary" style={{width:'100%'}}>Pošlji povpraševanje</Button>
            </div>
          </form>
        </div>
      </section>

      <footer style={{background:'#1f2937', color:'#d1d5db', padding:'1.25rem 0', marginTop:20}}>
        <div className="container" style={{textAlign:'center'}}>
          <p>© {new Date().getFullYear()} Vodovodni Material. Vse pravice pridržane.</p>
        </div>
      </footer>
    </div>
  )
}
