var express = require('express');
var router = express.Router();

// 16.게시판 조회
router.get('/:postBoard_id/posts', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id;
    var page = req.query.page;
    var search = req.query.search;
    var condition = req.query.condition;
//hgjhgjhsadasdas
    var result = {
        "successResult": {
            "message": "게시판의 글들을 조회 하였습니다",
            "page": 1,
            "listPerPage": 10,
            "postList": [
                {
                    "post_id": "1",
                    "writer": "고객네일환영",
                    "date": "2015-01-30 13:23",
                    "title": "팁드립니다",
                    "content": "지울때 XXX 을 쓰면 깔끔해요",
                    "photo": "./public/photos/board/xxxxxx0.jpg",
                    "replies": {
                        "repliesPage": 1,
                        "listPerPage": 10,
                        "repiesList": [
                            {"date": "2015-01-30 13:33", "writer": "abcd@onix.example.com", "content": "정말요??"},
                            {"date": "2015-01-30 13:35", "writer": "xte@onix.example.com", "content": "대단합니다~!ㅋㅋ"}
                        ]
                    }
                }
            ]
        }
    };
    res.json(result);
});
// 17. 게시판 내 댓글 더보기
router.get('/:postBoard_id/posts/:post_id/replies', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)
    var post_id = req.params.post_id; // 해당 게시판 글 id
    var repliespage = req.query.repliespage;

    var result = {
        "successResult": {
            "message": "댓글들을 추가로 불러왔습니다.",
            "repliespage": repliespage, //2페이지 이상
            "listPerPage": 10,
            "replies": [{"date": "2015-01-30 13:33", "writer": "abcd@onix.example.com", "content": "정말요??"},
                {"date": "2015-01-30 13:35", "writer": "xte@onix.example.com", "content": "대단합니다~!ㅋㅋ"}
            ]
        }
    };
    res.json(result);
});

// 18. 게시판  글 쓰기
router.post('/:postBoard_id/posts', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)

    var writer = req.body.writer; //작성자
    var title = req.body.title; // 제목
    var content = req.body.content; // 내용
    var photo = req.body.photo; //사진

    var result = {
        "successResult": {
            "message": "게시글이 정상적으로 게시되었습니다."
        }
    };
    res.json(result);

});

// 19.게시판 내에 댓글 쓰기
router.post('/:postBoard_id/posts/:post_id/replies', function (req, res, next) {
    var postBoard_id = req.params.postBoard_id; //1(QnA), 2(커뮤니티), 3(공지사항)
    var post_id = req.params.post_id; // 해당 게시판 글 id
    var content = req.body.content; // 댓글내용

    var result = {
        "successResult": {
            "message": "댓글이 정상적으로 게시되었습니다."
        }
    };

    res.json(result);
});


module.exports = router;