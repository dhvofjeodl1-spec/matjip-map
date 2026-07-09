// 맛집맵 목업 데이터
//
// 확장 대비 노트:
// - Supabase 연동 시: 이 배열을 그대로 "restaurants" 테이블 행 구조로 옮길 수 있습니다.
//   각 필드명을 스네이크 케이스 컬럼명으로 매핑하면 됩니다 (id는 uuid 기본키로 대체 가능).
// - 블로그 리뷰 기능 대비: `blogReviewUrl` 필드를 준비해두었습니다. 값이 있으면 하단 카드에
//   "블로그 리뷰 보러가기" 버튼이 노출됩니다. 추후 블로그/리뷰 컬렉션과 연결해 실제 글 목록을
//   보여주는 형태로 확장할 수 있습니다.

export type Category = '한식' | '중식' | '일식' | '카페' | '고기' | '양식' | '기타';

export interface MenuItem {
  name: string;
  price: number; // 원 단위
}

export interface Restaurant {
  id: string;
  name: string;
  category: Category;
  rating: number;
  reviewCount: number;
  /** 한 줄 요약 리뷰 */
  shortReview: string;
  isOpen: boolean;
  imageUrl: string;
  address: string;
  tags: string[];
  /** 대표 메뉴 및 가격 */
  menu: MenuItem[];
  /**
   * 네이버 지도에 표시할 실제 위도/경도.
   * 주소 지오코딩에 실패했거나 아직 지오코딩이 구성되지 않은 경우 null이 될 수 있으며,
   * 이 경우 지도에 마커가 표시되지 않습니다.
   */
  lat: number | null;
  lng: number | null;
  /** 연락처 */
  phone?: string;
  /** 승인 여부 */
  isApproved?: boolean;
  ownerId?: string;
  ownerEmail?: string;
  /** TODO: 블로그 리뷰 기능 연동 시 사용 (현재는 값이 없으면 카드에 노출되지 않음) */
  blogReviewUrl?: string;
}

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: '형제육회 본점',
    category: '한식',
    rating: 4.8,
    reviewCount: 1250,
    shortReview: '신선한 육회와 푸짐한 밑반찬이 인상적인 노포 맛집이에요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop',
    address: '서울 종로구 종로 200-1',
    tags: ['육회', '가성비', '노포'],
    menu: [
      { name: '육회 (소)', price: 28000 },
      { name: '육회비빔밥', price: 12000 },
      { name: '도가니탕', price: 11000 },
    ],
    lat: 37.5704,
    lng: 126.991,
  },
  {
    id: '2',
    name: '진진 중화요리',
    category: '중식',
    rating: 4.6,
    reviewCount: 890,
    shortReview: '멘보샤가 겉바속촉, 웨이팅은 필수지만 그만한 값어치가 있어요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=800&auto=format&fit=crop',
    address: '서울 마포구 잔다리로 123',
    tags: ['멘보샤', '미슐랭', '예약필수'],
    menu: [
      { name: '멘보샤', price: 32000 },
      { name: '삼선짬뽕', price: 14000 },
      { name: '유린기', price: 26000 },
    ],
    lat: 37.5519,
    lng: 126.921,
  },
  {
    id: '3',
    name: '스시 오마카세 슌',
    category: '일식',
    rating: 4.9,
    reviewCount: 340,
    shortReview: '제철 재료로 채운 오마카세, 데이트 코스로 완벽해요.',
    isOpen: false,
    imageUrl:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop',
    address: '서울 강남구 테헤란로 404',
    tags: ['오마카세', '고급', '데이트'],
    menu: [
      { name: '런치 오마카세', price: 89000 },
      { name: '디너 오마카세', price: 150000 },
    ],
    lat: 37.5,
    lng: 127.0364,
  },
  {
    id: '4',
    name: '블루보틀 삼청',
    category: '카페',
    rating: 4.5,
    reviewCount: 2100,
    shortReview: '한옥 마을 뷰가 예쁜 카페, 커피 향이 진해서 좋아요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop',
    address: '서울 종로구 북촌로5길 76',
    tags: ['커피맛집', '뷰맛집', '분위기'],
    menu: [
      { name: '뉴올리언스', price: 6500 },
      { name: '핸드드립 커피', price: 7000 },
      { name: '크루아상', price: 5000 },
    ],
    lat: 37.5826,
    lng: 126.983,
  },
  {
    id: '5',
    name: '금돼지식당',
    category: '고기',
    rating: 4.7,
    reviewCount: 4500,
    shortReview: '두툼한 삼겹살이 인생 맛집이라 불릴 만해요. 웨이팅은 각오하세요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1605807646983-377bc5a76493?q=80&w=800&auto=format&fit=crop',
    address: '서울 중구 다산로 149',
    tags: ['삼겹살', '웨이팅', '인생고기'],
    menu: [
      { name: '숙성 삼겹살', price: 17000 },
      { name: '항정살', price: 18000 },
      { name: '된장찌개', price: 5000 },
    ],
    lat: 37.558,
    lng: 127.01,
  },
  {
    id: '6',
    name: '명동교자 본점',
    category: '한식',
    rating: 4.6,
    reviewCount: 8800,
    shortReview: '진한 육수의 칼국수와 마늘김치 조합이 중독적이에요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1552611052-33e04de081de?q=80&w=800&auto=format&fit=crop',
    address: '서울 중구 명동10길 29',
    tags: ['칼국수', '마늘김치', '미슐랭'],
    menu: [
      { name: '칼국수', price: 11000 },
      { name: '만두', price: 11000 },
      { name: '왕만두', price: 12000 },
    ],
    lat: 37.5636,
    lng: 126.9834,
  },
  {
    id: '7',
    name: '테라로사 커피',
    category: '카페',
    rating: 4.4,
    reviewCount: 1500,
    shortReview: '넓은 공간에서 여유롭게 즐기는 드립커피가 매력적이에요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop',
    address: '서울 강남구 테헤란로 440',
    tags: ['드립커피', '베이커리', '넓은공간'],
    menu: [
      { name: '드립커피', price: 7500 },
      { name: '아메리카노', price: 5500 },
      { name: '치즈케이크', price: 8000 },
    ],
    lat: 37.5013,
    lng: 127.0396,
  },
  {
    id: '8',
    name: '연남토마 (베트남쌀국수)',
    category: '기타',
    rating: 4.5,
    reviewCount: 620,
    shortReview: '진한 사골 육수의 쌀국수가 든든해요. 향채 조절도 가능해서 부담 없어요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=800&auto=format&fit=crop',
    address: '서울 마포구 성미산로 60',
    tags: ['쌀국수', '베트남음식', '든든한한끼'],
    menu: [
      { name: '소고기 쌀국수', price: 10000 },
      { name: '분짜', price: 12000 },
      { name: '월남쌈', price: 15000 },
    ],
    lat: 37.5615,
    lng: 126.9254,
  },
  {
    id: '9',
    name: '오스테리아 청담',
    category: '양식',
    rating: 4.7,
    reviewCount: 780,
    shortReview: '수제 파스타와 화덕피자가 훌륭해요. 기념일 저녁으로 딱이에요.',
    isOpen: true,
    imageUrl:
      'https://images.unsplash.com/photo-1481931098730-318b6f776db0?q=80&w=800&auto=format&fit=crop',
    address: '서울 강남구 도산대로 300',
    tags: ['파스타', '피자', '기념일'],
    menu: [
      { name: '트러플 크림 파스타', price: 32000 },
      { name: '마르게리타 피자', price: 24000 },
      { name: '스테이크', price: 45000 },
    ],
    lat: 37.5241,
    lng: 127.0399,
  },
];
