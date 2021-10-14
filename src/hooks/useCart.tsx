import { executionAsyncResource } from 'async_hooks';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}
interface UpdateProductAmount {
  productId: number;
  amount: number;
}
interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {  
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let stockAmount : number = 0;
      await api.get(`stock/${productId}`)
      .then((item)=>{
        stockAmount = item.data.amount
      })
      await api.get(`products/${productId}`)
      .then((prod)=>{
        const processedProduct = cart.find(prod => prod.id === productId)
        if(!processedProduct){
          if(stockAmount < 1) {
            toast.error('Quantidade solicitada fora de estoque');
            return
          }
          const upToDateCart = [...cart, {...prod.data, amount : 1}] 
          setCart(upToDateCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(upToDateCart))
          
        } else if (processedProduct){
          if(processedProduct.amount >= stockAmount){
            toast.error('Quantidade solicitada fora de estoque')
            return
          } 
          const upToDateCart = cart.map((item)=>{
            if(item.id === productId){
              return {...item, amount : item.amount + 1}
            }
            return item
          })

          setCart(upToDateCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(upToDateCart))
        }
      })
    } catch(e) {
      toast.error('Erro na adição do produto')
    } 
  }

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(prod => prod.id === productId)){
          toast.error('Erro na remoção do produto');
          return
      } else if(cart.find(prod => prod.id === productId)){
          const upToDateCart = cart.filter(prod => prod.id != productId)
          setCart(upToDateCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(upToDateCart))
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({productId, amount}: UpdateProductAmount) => {
    
    try {
      if(!cart.find(prod => prod.id === productId)){
        toast.error('Erro na alteração de quantidade do produto')
        return
      }
      if(!amount) return

      let stockAmount : number = 0;
      await api.get(`stock/${productId}`)
      .then((item)=>{
        stockAmount = item.data.amount
      })
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque')
        amount = stockAmount
        return
      } 
        const upToDateCart = cart.map((prod)=>{
          if(prod.id === productId){
            return {...prod, amount}
          }else{
            return prod
          }
        })
        setCart(upToDateCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(upToDateCart))

    } catch {
        toast.error('Quantidade solicitada fora de estoque')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  return context;
}