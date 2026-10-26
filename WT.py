




def f1(B,K,G): return int(B and (not K))

def f2(B,K,G): return G



for B in [0, 1]:
  for K in [0, 1]:
    for G in [0,1]:
      x1 = f1(B,K,G)
      x2 = f2(B,K,G)
      print(B, K, G, x1, x2)




