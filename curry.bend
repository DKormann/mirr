


import Base

type U is Data:
  u{}


type N is Data:
  z{}
  s{n: N}

def a_f (~u: U) -> U : u

def a_consume( ~f: (@-x:U -> U)) -> U: u{}

def a(x: U) -> U:
  a_consume(a_f) # allowed?!




def K () -> Type :
  @-x:K -> U

# def id (~x: K) -> @-s:K -> U: x

def ppf(k:K) -> U: k(k)

def pr(~x: K) -> U:
  # id(x)(x)
  x(x)


# compile(`(_passDead(-T: Type, -x:T, f: ((-x:T)->T) ) : T = (f x) )`)

def passDead (-T: Type, -x: T, f: @-x:T -> @-y:T-> T) -> T : f(x, x)



def mka (k: K) -> U : k(k)

def mmk () -> @x:K -> U : mka

def ff(~k: (@-x:K -> U)) -> K:
  k

def Kl () -> Type :
  @x:Kl -> U

# def mkal(-k:Kl) -> U : k(k)

# def kk()->K:
#   ff(pr) # not allowed!


# def uu() -> U:
#   pr(pr)



# def K () -> Type:
  # @~x:K->U

# def id 

def ffnd(a: N, b: N) -> N:
  match a:
  case z{}: b
  case s{+n}:
    match b:
    case z{}:
      ffnd(n, s{b})
    case s{k}:
      ffnd(a, k)

# def Eq.congruence (T: Type, a: T, b: T, f: (x: ) )


def TRAN() -> Type:

  @T: Type -> @-a:T -> @-b:T -> @f:(@x:T -> Type) -> @e:{a == b: T} -> f(a) -> f(b)


def eq.symm(T: Data, -a: T, b: T, e: {a == b: T}, trn: TRAN) -> {b == a: T}:



  fn = {(x:T) => {x == a: T} : @x:T -> Type}

  trn(T, a, b, fn, e, {==})


def dubT (~T: Type, P: @x:Type -> @y:Type -> Type) -> Type : P(T, T)



def sym_invol(-A: Type, -a: A, -b: A, e: {a == b : A})
      -> {Equal.sym(A, b, a, Equal.sym(A, a, b, e)) == e : {a == b : A}}:
    %p@e : {Equal.sym(A, _, a, Equal.sym(A, a, _, p)) == p : {a == _ : A}}
    {==}