import { useState, useEffect, useMemo } from 'react';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  const [checkoutStep, setCheckoutStep] = useState('idle'); // 'idle', 'summary', 'processing', 'ticket'
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [ticketData, setTicketData] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); 
      const res = await fetch('/users.json');
      if (!res.ok) throw new Error('Error de conexión');
      const data = await res.json();
      
      const user = data.users.find(u => 
        (u.email === loginInput || u.username === loginInput) && 
        u.password === password
      );

      if (user) {
        setCurrentUser(user);
        setShowLogin(false);
        setLoginInput('');
        setPassword('');
        if (rememberMe) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      } else {
        setLoginError('Credenciales incorrectas. Verifica tu email/usuario o contraseña.');
      }
    } catch (err) {
      setLoginError('Hubo un error al intentar iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCart([]);
  };

  const handleCheckout = () => {
    if (!currentUser) {
      setShowLogin(true);
      setIsCartOpen(false);
    } else {
      setCheckoutStep('summary');
      setIsCartOpen(false);
    }
  };

  const executeCheckout = async () => {
    setCheckoutStep('processing');
    setProgress(0);
    
    setProgressText('Validando conexión con el servidor...');
    await new Promise(resolve => setTimeout(resolve, 800));
    setProgress(20);

    setProgressText('Verificando disponibilidad de inventario...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProgress(40);

    setProgressText('Calculando totales e impuestos...');
    await new Promise(resolve => setTimeout(resolve, 600));
    setProgress(60);

    setProgressText('Enviando pedido a la sucursal...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    setProgress(80);

    setProgressText('Guardando comprobante de compra...');
    await new Promise(resolve => setTimeout(resolve, 800));
    setProgress(100);

    const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
    const date = new Date().toLocaleString();
    setTicketData({ orderId, date, items: [...cart], subtotal, iva, discount, total });
    
    setTimeout(() => {
      setCheckoutStep('ticket');
    }, 500);
  };

  const finishCheckoutAndReturn = () => {
    setCart([]);
    setTicketData(null);
    setCheckoutStep('idle');
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await fetch('/products.json');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      
      const productsWithStock = data.map(p => ({
        ...p,
        stock: Math.floor(Math.random() * 20) + 1
      }));

      setProducts(productsWithStock);
      
      const uniqueCats = [...new Set(productsWithStock.map(p => p.category))];
      setCategories(uniqueCats);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2000);
    
    fetchProducts();
    
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (sortBy) {
      result.sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name-asc') return a.title.localeCompare(b.title);
        if (sortBy === 'name-desc') return b.title.localeCompare(a.title);
        return 0;
      });
    }
    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty > 0 && newQty <= item.stock) {
            return { ...item, quantity: newQty };
          }
        }
        return item;
      });
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const iva = subtotal * 0.16;
  const discount = subtotal > 500 ? subtotal * 0.10 : 0;
  const total = subtotal + iva - discount;

  // Render Splash Screen
  if (splashVisible) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F2F2F2] transition-opacity duration-500 font-sans">
        <h1 className="text-4xl font-semibold tracking-tight text-[#5BC2D9] mb-6">🛍️ Tienda Digital</h1>
        {isLoading && (
          <div className="w-10 h-10 border-4 border-black/10 border-l-[#5BC2D9] rounded-full animate-spin"></div>
        )}
      </div>
    );
  }

  // Render Login
  if (showLogin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F2F2F2] font-sans p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 w-full max-w-sm text-center">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-800">Iniciar sesión</h2>
          <form className="flex flex-col gap-5 text-left" onSubmit={handleLogin}>
            <div className="relative flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">Correo electrónico o Usuario</label>
              <input 
                type="text" 
                placeholder="hombre@dominio.com" 
                className="px-4 py-4 bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-[#EDAA5C] focus:ring-4 focus:ring-[#EDAA5C]/20 outline-none transition-all text-sm font-medium"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                required
              />
            </div>
            
            <div className="relative flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">Contraseña</label>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" 
                className="px-4 py-4 bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-[#EDAA5C] focus:ring-4 focus:ring-[#EDAA5C]/20 outline-none transition-all text-sm font-medium pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                title="Mostrar/Ocultar contraseña"
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-[#EDAA5C] focus:ring-[#EDAA5C]"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label>Mantener mi sesión iniciada</label>
            </div>

            {loginError && <p className="text-[#ff4d4f] text-sm text-center font-medium bg-[#ff4d4f]/10 py-2 rounded-lg">{loginError}</p>}

            <button type="submit" className="w-full bg-[#EDAA5C] hover:bg-orange-400 text-white py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-[#EDAA5C]/20 mt-2" disabled={isLoggingIn}>
              {isLoggingIn ? "Cargando..." : "Entrar a mi cuenta"}
            </button>
            
            <button 
              type="button" 
              className="text-slate-400 hover:text-[#5BC2D9] underline text-sm font-semibold transition-colors mt-2"
              onClick={() => setShowLogin(false)} 
            >
              Cancelar y volver a la tienda
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Error Pantalla Principal
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F2] font-sans">
        <h2 className="text-xl text-[#EDAA5C] font-bold mb-4">Oops! Hubo un problema de conexión con el servidor.</h2>
        <button className="bg-[#5BC2D9] hover:bg-[#3F6F8C] text-white px-8 py-3 rounded-2xl font-bold transition-colors shadow-lg shadow-[#5BC2D9]/20" onClick={fetchProducts}>Intentar de nuevo</button>
        {currentUser && (
          <button className="mt-6 text-[#5BC2D9] hover:underline transition-colors font-medium" onClick={handleLogout}>Cerrar sesión</button>
        )}
      </div>
    );
  }

  // Render Checkout
  if (checkoutStep !== 'idle') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md font-sans p-4 transition-all duration-300">
        <div className="bg-white/95 p-10 rounded-[2rem] shadow-2xl border border-white/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl">
          
          {checkoutStep === 'summary' && (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-center text-slate-800 mb-8">Resumen de Pedido</h2>
              <ul className="border-b border-slate-200 pb-6 mb-6 space-y-4">
                {cart.map(item => (
                  <li key={item.id} className="flex justify-between items-center text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex items-center justify-center">
                        <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                      </div>
                      <span className="font-semibold text-slate-700 text-lg">{item.quantity}x {item.title.substring(0,35)}...</span>
                    </div>
                    <span className="font-bold text-slate-800 text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              
              <div className="text-lg text-slate-500 flex flex-col gap-3 px-2">
                <div className="flex justify-between font-medium"><span>Subtotal:</span> <span className="text-slate-700">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium"><span>IVA (16%):</span> <span className="text-slate-700">${iva.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-[#90C461] font-semibold"><span>Descuento:</span> <span>-${discount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-3xl font-extrabold text-[#5BC2D9] mt-6 border-t border-slate-200 pt-6">
                  <span>Total a Pagar:</span> <span>${total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex gap-4 mt-10">
                <button className="flex-1 py-4 px-4 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]" onClick={() => setCheckoutStep('idle')}>Volver al Carrito</button>
                <button className="flex-1 py-4 px-4 rounded-2xl bg-[#3F6F8C] hover:bg-[#5BC2D9] text-white font-bold transition-all duration-300 active:scale-[0.98] shadow-lg shadow-[#3F6F8C]/20 hover:shadow-[#5BC2D9]/40" onClick={executeCheckout}>Finalizar Compra</button>
              </div>
            </>
          )}

          {checkoutStep === 'processing' && (
            <div className="text-center py-12">
              <h3 className="text-2xl font-bold text-[#5BC2D9] mb-8">Procesando tu pedido...</h3>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                <div className="h-full bg-[#EDAA5C] rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="font-semibold text-slate-500">{progressText}</p>
            </div>
          )}

          {checkoutStep === 'ticket' && ticketData && (
            <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-[2rem] font-mono text-sm shadow-sm">
              <div className="text-center border-b border-dashed border-slate-200 pb-4 mb-6">
                <h2 className="text-2xl font-bold mb-2">FAST FOOD DIGITAL</h2>
                <p className="text-slate-500">¡Gracias por tu compra, {currentUser?.username}!</p>
              </div>
              <div className="text-slate-600 mb-6 space-y-1">
                <div><strong className="text-slate-800">Orden ID:</strong> {ticketData.orderId}</div>
                <div><strong className="text-slate-800">Fecha:</strong> {ticketData.date}</div>
              </div>
              
              <table className="w-full text-left mb-6">
                <thead>
                  <tr className="border-b border-dashed border-slate-200 text-slate-800">
                    <th className="pb-2">Cant</th>
                    <th className="pb-2">Producto</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {ticketData.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3">{item.title.substring(0, 15)}...</td>
                      <td className="text-right py-3 font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="border-t border-dashed border-slate-200 pt-6 font-bold text-slate-800 space-y-3">
                <div className="flex justify-between"><span>SUBTOTAL</span> <span>${ticketData.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA</span> <span>${ticketData.iva.toFixed(2)}</span></div>
                {ticketData.discount > 0 && (
                  <div className="flex justify-between text-[#90C461]"><span>DESCUENTO</span> <span>-${ticketData.discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-2xl text-[#5BC2D9] mt-6 pt-4 border-t border-slate-100"><span>TOTAL</span> <span>${ticketData.total.toFixed(2)}</span></div>
              </div>
              <button className="w-full mt-8 bg-[#3F6F8C] hover:bg-[#5BC2D9] shadow-lg shadow-[#3F6F8C]/20 hover:shadow-[#5BC2D9]/40 text-white font-sans font-bold py-4 rounded-2xl transition-all active:scale-95" onClick={finishCheckoutAndReturn}>Volver al Inicio</button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // MAIN RENDER (CATALOG)
  return (
    <div className="min-h-screen font-sans flex flex-col sm:flex-row relative bg-[#F2F2F2]">
      
      {/* Catálogo Principal */}
      <main className="flex-1 w-full lg:pr-[400px] pb-24 sm:pb-8">
        
        {/* Sticky Glassmorphism Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 p-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center">
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              className="flex-1 min-w-[200px] px-5 py-3 bg-slate-100/50 rounded-xl border border-transparent focus:bg-white focus:border-[#5BC2D9] focus:ring-4 focus:ring-[#5BC2D9]/20 outline-none transition-all text-sm font-medium shadow-inner shadow-slate-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <select 
              className="px-5 py-3 bg-slate-100/50 rounded-xl border border-transparent focus:bg-white focus:border-[#5BC2D9] focus:ring-4 focus:ring-[#5BC2D9]/20 outline-none text-sm font-medium transition-all cursor-pointer shadow-inner shadow-slate-100"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <select 
              className="px-5 py-3 bg-slate-100/50 rounded-xl border border-transparent focus:bg-white focus:border-[#5BC2D9] focus:ring-4 focus:ring-[#5BC2D9]/20 outline-none text-sm font-medium transition-all cursor-pointer shadow-inner shadow-slate-100"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="">Ordenar por...</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name-asc">Nombre: A - Z</option>
              <option value="name-desc">Nombre: Z - A</option>
            </select>
            
            <div className="ml-auto">
              {currentUser ? (
                <button 
                  onClick={handleLogout} 
                  className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Cerrar sesión ({currentUser.username})
                </button>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)} 
                  className="px-6 py-3 rounded-xl bg-[#5BC2D9] hover:bg-[#3F6F8C] text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-[#5BC2D9]/30"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <div className="p-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-sm flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100">
                <div className="h-48 w-full flex items-center justify-center mb-6 p-4 bg-slate-50 rounded-2xl group relative overflow-hidden">
                  <img src={p.image} alt={p.title} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                </div>
                <p className="text-xs uppercase font-extrabold tracking-widest text-[#EDAA5C] mb-2">{p.category}</p>
                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-3 line-clamp-2">{p.title}</h3>
                <p className="text-2xl font-extrabold text-slate-900 mb-2">${p.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#5BC2D9] mb-6 bg-[#5BC2D9]/10 w-fit px-3 py-1 rounded-full">
                  ⭐ {p.rating?.rate} <span className="text-slate-500 ml-1">({p.rating?.count})</span> <span className="text-slate-300 mx-1">|</span> <span className="text-[#90C461]">Disp: {p.stock}</span>
                </div>
                <button 
                  className="mt-auto w-full py-3.5 rounded-2xl bg-[#3F6F8C] text-white font-bold hover:bg-[#5BC2D9] hover:shadow-lg hover:shadow-[#5BC2D9]/30 transition-all duration-300 active:scale-95"
                  onClick={() => addToCart(p)}
                >
                  + Agregar al carrito
                </button>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-20 text-slate-500 font-bold text-lg">No se encontraron productos.</div>
          )}
        </div>
      </main>

      {/* Mobile Floating Cart Toggle */}
      <button 
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-[#3F6F8C] hover:bg-[#5BC2D9] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-[#3F6F8C]/40 z-50 text-2xl font-bold transition-all active:scale-90"
        onClick={() => setIsCartOpen(!isCartOpen)}
      >
        🛒 <span className="absolute -top-2 -right-2 bg-[#EDAA5C] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md shadow-[#EDAA5C]/50 border-2 border-white">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
      </button>

      {/* Cart Sidebar (Glassmorphism) */}
      <aside className={`fixed right-0 top-0 h-full w-full lg:w-[400px] bg-white/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.1)] border-l border-white z-[100] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Tu Pedido</h2>
          <button className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-bold" onClick={() => setIsCartOpen(false)}>✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-slate-50 rounded-xl p-2 flex items-center justify-center flex-shrink-0">
                <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-700 text-sm truncate">{item.title}</div>
                <div className="font-extrabold text-[#5BC2D9] text-base mt-1">${(item.price * item.quantity).toFixed(2)}</div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 font-bold hover:bg-slate-50 transition-colors" onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span className="w-10 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                    <button className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 font-bold hover:bg-slate-50 transition-colors" onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <button className="ml-auto text-xs text-[#ff4d4f] bg-[#ff4d4f]/10 px-3 py-2 rounded-lg font-bold hover:bg-[#ff4d4f]/20 transition-colors" onClick={() => removeFromCart(item.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <span className="text-5xl opacity-50">🛒</span>
              <p className="font-bold text-sm">Tu carrito está vacío.</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-white/90 backdrop-blur-xl border-t border-slate-100 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <div className="space-y-3 text-sm font-medium text-slate-500 mb-6">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-slate-700 font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (16%):</span>
              <span className="text-slate-700 font-bold">${iva.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#90C461] font-bold">
                <span>Descuento (10%):</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-extrabold text-[#5BC2D9] pt-4 border-t border-slate-100 mt-3">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            className="w-full bg-[#3F6F8C] hover:bg-[#5BC2D9] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#3F6F8C]/20 hover:shadow-[#5BC2D9]/40 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 mb-4" 
            disabled={cart.length === 0} 
            onClick={handleCheckout}
          >
            Enviar Pedido
          </button>
          <button 
            className="w-full bg-transparent border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100" 
            onClick={clearCart} 
            disabled={cart.length === 0}
          >
            Vaciar Carrito
          </button>
        </div>
      </aside>
    </div>
  );
}

export default App;
