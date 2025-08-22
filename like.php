<?php
/**
 * like.php
 *
 * @author      gemini
 * @since       1.0.0
 */

// 引入 Typecho 环境
require_once './config.inc.php';

header('Content-Type: application/json');

if (isset($_POST['cid'])) {
    $cid = intval($_POST['cid']);
    if ($cid == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid post ID']);
        exit;
    }

    $db = Typecho_Db::get();
    $prefix = $db->getPrefix();

    // 查询文章是否存在
    $post = $db->fetchRow($db->select()->from($prefix . 'contents')->where('cid = ?', $cid));
    if (!$post) {
        echo json_encode(['status' => 'error', 'message' => 'Post not found']);
        exit;
    }

    // 获取当前点赞数
    $likes = $db->fetchRow($db->select('str_value')->from($prefix . 'fields')->where('cid = ? AND name = ?', $cid, 'likes'));
    
    $current_likes = 0;
    if ($likes && isset($likes['str_value'])) {
        $current_likes = intval($likes['str_value']);
    }

    // 增加点赞数
    $new_likes = $current_likes + 1;

    // 更新或插入点赞数字段
    if ($likes) {
        $db->query($db->update($prefix . 'fields')->rows(['str_value' => $new_likes])->where('cid = ? AND name = ?', $cid, 'likes'));
    } else {
        $db->query($db->insert($prefix . 'fields')->rows(['cid' => $cid, 'name' => 'likes', 'type' => 'str', 'str_value' => $new_likes, 'int_value' => 0, 'float_value' => 0]));
    }

    echo json_encode(['status' => 'success', 'likes' => $new_likes]);

} else {
    echo json_encode(['status' => 'error', 'message' => 'Missing post ID']);
}
