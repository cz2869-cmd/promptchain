export type CafeCopy = {
  description: string
  neighborhood: string
  vibe: string
  address: string
  image?: string
}

const COPY: Record<string, CafeCopy> = {
  'joes coffee': {
    description:
      'A Columbia staple for lattes between classes. Grab a window seat when you need to feel like a real New Yorker for twenty minutes.',
    neighborhood: 'Morningside Heights',
    vibe: 'Between-class fuel',
    address: '550 W 120th St, Northwest Corner',
    image: '/cafes/joes-coffee.webp',
  },
  'blue bottle': {
    description:
      'Bright, precise, and a little extra — the kind of pour-over that makes a midwest transplant text their group chat about "the coffee here."',
    neighborhood: 'Morningside Heights',
    vibe: 'Clean and caffeinated',
    address: '2901 Broadway',
    image: '/cafes/blue-bottle.jpg',
  },
  maki: {
    description:
      'Matcha-forward and photogenic. Perfect when you want a treat that still looks like you have your life together.',
    neighborhood: 'Near campus',
    vibe: 'Soft and green',
    address: '3208 Broadway',
    image: '/cafes/maki.jpg',
  },
  'blue java cafe': {
    description:
      'Campus-close caffeine with enough table space to spread out a laptop, a problem set, and a pastry you swore you would not buy.',
    neighborhood: 'Morningside Heights',
    vibe: 'Laptop hours',
    address: 'Butler Library, 535 W 114th St',
    image: '/cafes/blue-java.webp',
  },
  'kuro kuma': {
    description:
      'Dark, cozy, and a little mysterious — the weekend cafe when the dorm lounge is too loud and the city still feels new.',
    neighborhood: 'Near campus',
    vibe: 'Moody hideout',
    address: '121 La Salle St',
    image: '/cafes/kuro-kuma.jpg',
  },
  'dear mama': {
    description:
      'Comfort food energy in cafe form. Come here when you miss home cooking but still want to people-watch on Broadway.',
    neighborhood: 'Morningside Heights',
    vibe: 'Homey and filling',
    address: '611 W 129th St',
    image: '/cafes/dear-mama.jpg',
  },
  'sipsteria morningside': {
    description:
      'A Morningside sip spot for slow weekend walks. Bring a friend from the floor and pretend you have a regular order.',
    neighborhood: 'Morningside Heights',
    vibe: 'Weekend wander',
    address: '1264 Amsterdam Ave',
    image: '/cafes/sipsteria.jpg',
  },
  'the hungarian pastry shop': {
    description:
      'The legendary study cave. Overhear thesis panic, share a table, and stay until the light turns gold on Amsterdam.',
    neighborhood: 'Morningside Heights',
    vibe: 'Classic study haunt',
    address: '1030 Amsterdam Ave',
    image: '/cafes/hungarian-pastry.png',
  },
  'cafe east': {
    description:
      'East-campus caffeine when you are done crossing campus in the wind. Quick, warm, and unfussy.',
    neighborhood: 'East of campus',
    vibe: 'No-frills warm-up',
    address: 'Lerner Hall, 2920 Broadway',
    image: '/cafes/cafe-east.webp',
  },
  'qahwah house': {
    description:
      'Yemeni coffee, cardamom, and a reason to leave the dorm without a five-hour study plan. A weekend ritual waiting to happen.',
    neighborhood: 'Near campus',
    vibe: 'Spiced and social',
    address: '2869 Broadway',
    image: '/cafes/qahwah-house.jpg',
  },
}

export function displayName(name: string) {
  return name
    .split(' ')
    .map((word) =>
      word.toLowerCase() === 'maki'
        ? 'MAKI'
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ')
}

export function cafeCopy(
  name: string,
  cafe?: {
    description?: string | null
    neighborhood?: string | null
    vibe?: string | null
  }
): CafeCopy {
  const fallback = COPY[name.trim().toLowerCase()] ?? {
    description: 'A campus cafe worth lingering in. Pull up a chair and rate the vibe.',
    neighborhood: 'Near campus',
    vibe: 'Cozy corner',
    address: 'Near Columbia',
  }

  return {
    description: cafe?.description?.trim() || fallback.description,
    neighborhood: cafe?.neighborhood?.trim() || fallback.neighborhood,
    vibe: cafe?.vibe?.trim() || fallback.vibe,
    address: fallback.address,
    image: fallback.image,
  }
}

export function when(iso: string) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
  return `${formatted} ET`
}
